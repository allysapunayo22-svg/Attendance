import { useMemo, useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Event } from "@attendance/types";
import { EmptyState, LoadingState } from "../../../src/components/ScreenState";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { useEvents } from "../../../src/hooks/useEvents";
import { getLatestAttendanceForEvent } from "../../../src/repositories/attendanceRepository";
import { getCachedEvent } from "../../../src/repositories/eventsRepository";
import { formatDateTime } from "../../../src/utils/format";
import { getEventPhase } from "../../../src/utils/events";

function parseQrToken(token: string) {
  const [eventId, expiresAtSeconds] = token.split(":");
  const expiresAt = Number(expiresAtSeconds);

  if (!eventId || !Number.isFinite(expiresAt)) {
    throw new Error("This QR code is not a valid attendance QR.");
  }

  if (Date.now() > expiresAt * 1000) {
    throw new Error("This QR code has expired. Ask the event marshal to generate a new one.");
  }

  return { eventId, expiresAt };
}

function isCheckInOpen(event: Event) {
  if (!event.schedule) return false;
  const now = Date.now();
  const opens = new Date(event.schedule.check_in_opens_at).getTime();
  const closes = Math.max(
    new Date(event.schedule.check_in_closes_at).getTime(),
    event.schedule.late_ends_at ? new Date(event.schedule.late_ends_at).getTime() : new Date(event.schedule.check_in_closes_at).getTime()
  );
  return now >= opens && now <= closes;
}

export default function ScanAttendanceScreen() {
  const eventsQuery = useEvents();
  const events = eventsQuery.data ?? [];
  const eventMap = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState("Scan the event QR code shown by the marshal.");
  const [processing, setProcessing] = useState(false);
  const [lastEvent, setLastEvent] = useState<Event | null>(null);

  async function resolveEvent(eventId: string) {
    return eventMap.get(eventId) ?? (await getCachedEvent(eventId));
  }

  async function submitScan(result: BarcodeScanningResult) {
    if (processing) return;
    setProcessing(true);

    try {
      const { eventId } = parseQrToken(result.data);
      const event = await resolveEvent(eventId);
      if (!event) throw new Error("Event is not cached on this phone. Open Events while online, then scan again.");
      setLastEvent(event);

      if (getEventPhase(event) !== "ongoing" && !isCheckInOpen(event)) {
        throw new Error("This event is not accepting check-ins right now.");
      }

      const existingTimeIn = await getLatestAttendanceForEvent(event.id, "time_in");
      if (existingTimeIn) {
        throw new Error("You already have a time-in record for this event.");
      }

      setMessage("Event found. Complete verification, then scan a fresh QR code before submitting.");
      router.replace({ pathname: "/check-in/[eventId]", params: { eventId: event.id } });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to scan attendance.");
    } finally {
      setProcessing(false);
    }
  }

  if (eventsQuery.isLoading && !eventsQuery.data) return <LoadingState label="Loading cached events" />;

  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
        <View className="flex-1 p-5">
          <EmptyState title="Camera permission needed" body="The scanner uses the camera only to read the event QR code." />
          <View className="mt-5">
            <PrimaryButton title={permission && !permission.canAskAgain ? "Open Settings" : "Allow Scanner"} icon={<Ionicons name="scan-outline" size={18} color="#ffffff" />} onPress={() => void (permission && !permission.canAskAgain ? Linking.openSettings() : requestPermission())} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={["top"]}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 p-5 pb-32">
        <View className="rounded-3xl bg-brand-900 p-5">
          <Text className="text-sm font-semibold text-brand-100">Scan attendance</Text>
          <Text className="mt-2 text-2xl font-bold text-white">Point your camera at the event QR</Text>
          <Text className="mt-2 text-sm leading-6 text-brand-50">This identifies the event. After location and photo checks, you’ll scan a fresh short-lived code before submitting.</Text>
        </View>

        {eventsQuery.isError ? (
          <View accessibilityRole="alert" className="rounded-2xl bg-amber-50 p-4">
            <Text className="text-sm text-amber-800">The latest event list could not be refreshed. Cached events can still be scanned.</Text>
          </View>
        ) : null}

        <View className="overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-sm">
          <CameraView
            style={{ height: 360 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={processing ? undefined : (result) => void submitScan(result)}
          />
        </View>

        <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-lg font-bold text-slate-950">{lastEvent?.title ?? "Waiting for scan"}</Text>
              <Text className="mt-1 text-sm text-slate-500">{lastEvent?.schedule ? formatDateTime(lastEvent.schedule.starts_at) : "Scan an event QR code to begin."}</Text>
            </View>
            <StatusBadge status={processing ? "uploading" : lastEvent ? "time_in_recorded" : "not_started"} />
          </View>
          <Text className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm font-semibold text-brand-900">{message}</Text>
          <Text className="mt-3 text-sm text-slate-500">Location verification continues on the next screen.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
