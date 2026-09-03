import { useEffect, useMemo, useRef, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { AttendanceStatus, Event } from "@attendance/types";
import { createIdempotencyKey, createLocalId, formatDistance, formatDurationMinutes } from "@attendance/shared-utils";
import { EmptyState } from "../../components/ScreenState";
import { InfoRow } from "../../components/InfoRow";
import { PrimaryButton } from "../../components/PrimaryButton";
import { StatusBadge } from "../../components/StatusBadge";
import { getCachedEvent } from "../../repositories/eventsRepository";
import { getLatestAttendanceForEvent, saveLocalAttendance } from "../../repositories/attendanceRepository";
import { evaluateLocationForEvent, requestFreshLocation } from "../../services/location";
import { compressAttendancePhoto } from "../../services/photo";
import { syncPendingAttendance } from "../../services/syncQueue";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useAuthStore } from "../../stores/authStore";
import { formatDateTime, formatTimeRange } from "../../utils/format";

interface AttendanceCaptureScreenProps {
  eventId: string;
  mode: "time_in" | "time_out";
}

type CaptureStep = "event" | "qr" | "photo" | "review";

interface CapturedPhoto {
  uri: string;
  hash: string;
}

interface SubmissionResult {
  localId: string;
  status: AttendanceStatus;
  submittedAt: string;
  title: string;
  body: string;
}

function attendanceWindowBounds(event: Event, mode: "time_in" | "time_out") {
  if (!event.schedule) return null;

  if (mode === "time_in") {
    const opens = new Date(event.schedule.check_in_opens_at).getTime();
    const closes = Math.max(
      new Date(event.schedule.check_in_closes_at).getTime(),
      event.schedule.late_ends_at ? new Date(event.schedule.late_ends_at).getTime() : new Date(event.schedule.check_in_closes_at).getTime()
    );
    return { opens, closes };
  }

  const opens = new Date(event.schedule.check_out_opens_at ?? event.schedule.ends_at).getTime();
  const closes = new Date(event.schedule.check_out_closes_at ?? event.schedule.ends_at).getTime();
  return { opens, closes };
}

function isWindowOpen(event: Event, mode: "time_in" | "time_out") {
  const bounds = attendanceWindowBounds(event, mode);
  if (!bounds) return false;
  const now = Date.now();
  return now >= bounds.opens && now <= bounds.closes;
}

function attendanceWindowLabel(event: Event, mode: "time_in" | "time_out") {
  const bounds = attendanceWindowBounds(event, mode);
  if (!bounds) return "Schedule pending";
  return formatTimeRange(new Date(bounds.opens).toISOString(), new Date(bounds.closes).toISOString());
}

function StepHeader({ title, subtitle, stepIndex, totalSteps }: { title: string; subtitle: string; stepIndex: number; totalSteps: number }) {
  return (
    <View className="rounded-3xl bg-brand-900 p-5">
      <Text className="text-sm font-semibold text-brand-100">
        Step {stepIndex + 1} of {totalSteps}
      </Text>
      <Text className="mt-2 text-2xl font-bold text-white">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-brand-50">{subtitle}</Text>
      <View className="mt-4 flex-row gap-2">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View key={index} className={`h-2 flex-1 rounded-full ${index <= stepIndex ? "bg-white" : "bg-white/20"}`} />
        ))}
      </View>
    </View>
  );
}

function ChecklistRow({ label, done }: { label: string; done: boolean }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="min-w-0 flex-1 text-sm font-medium text-slate-700">{label}</Text>
      <View className={`h-7 w-7 items-center justify-center rounded-full ${done ? "bg-brand-50" : "bg-slate-100"}`}>
        <Ionicons name={done ? "checkmark" : "ellipse-outline"} size={16} color={done ? "#0f766e" : "#94a3b8"} />
      </View>
    </View>
  );
}

function SubmissionTimeline({ online }: { online: boolean }) {
  const items = [
    { label: "Recorded", detail: "Saved safely on this phone", done: true },
    { label: "Uploading", detail: online ? "Evidence sent securely" : "Waiting for internet", done: online },
    { label: "Verifying", detail: online ? "Server checks are running" : "Starts after upload", done: false },
    { label: "Verified", detail: "You’ll be notified when complete", done: false }
  ];
  return <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><Text className="text-lg font-bold text-slate-950">What happens next</Text><View className="mt-4">{items.map((item, index) => <View key={item.label} className="flex-row gap-3"><View className="items-center"><View className={`h-8 w-8 items-center justify-center rounded-full ${item.done ? "bg-brand-700" : "bg-slate-100"}`}><Ionicons name={item.done ? "checkmark" : "ellipse-outline"} size={15} color={item.done ? "#fff" : "#94a3b8"} /></View>{index < items.length - 1 ? <View className={`h-8 w-0.5 ${item.done && items[index + 1]?.done ? "bg-brand-600" : "bg-slate-200"}`} /> : null}</View><View className="pb-5"><Text className="font-semibold text-slate-900">{item.label}</Text><Text className="mt-0.5 text-xs text-slate-500">{item.detail}</Text></View></View>)}</View></View>;
}

export function AttendanceCaptureScreen({ eventId, mode }: AttendanceCaptureScreenProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [step, setStep] = useState<CaptureStep>("event");
  const [timeInRecord, setTimeInRecord] = useState<{ device_timestamp: string; status: string; sync_status: string } | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy: number; mocked?: boolean } | null>(null);
  const [message, setMessage] = useState("Start by confirming the event and attendance window.");
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [capturingPhoto, setCapturingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const online = useOnlineStatus();
  const deviceId = useAuthStore((state) => state.deviceId);

  useEffect(() => {
    void getCachedEvent(eventId).then(setEvent);
    if (mode === "time_out") {
      void getLatestAttendanceForEvent(eventId, "time_in").then((record) => setTimeInRecord(record ?? null));
    }
  }, [eventId, mode]);

  const locationResult = useMemo(() => {
    if (!event || !location) return null;
    return evaluateLocationForEvent(event, location);
  }, [event, location]);

  const elapsedMinutes = timeInRecord ? Math.max(0, Math.floor((Date.now() - new Date(timeInRecord.device_timestamp).getTime()) / 60000)) : 0;
  const remainingMinimumMinutes = event ? Math.max(0, event.minimum_attendance_minutes - elapsedMinutes) : 0;
  const remainingEventMinutes = event?.schedule ? Math.max(0, Math.floor((new Date(event.schedule.ends_at).getTime() - Date.now()) / 60000)) : 0;
  const timeOutDurationOk =
    !event ||
    mode === "time_in" ||
    event.early_time_out_allowed ||
    event.minimum_attendance_minutes <= 0 ||
    (timeInRecord ? Date.now() - new Date(timeInRecord.device_timestamp).getTime() >= event.minimum_attendance_minutes * 60000 : false);
  const photoRequired = event ? (mode === "time_in" ? event.photo_required : event.time_out_photo_required) : true;
  const scheduleOpen = event ? isWindowOpen(event, mode) : false;
  const eventReady = Boolean(deviceId) && scheduleOpen && timeOutDurationOk;
  const locationReady = Boolean(locationResult?.accuracyOk && locationResult.inside);
  const qrReady = !event?.dynamic_qr_required || Boolean(qrToken);
  const photoReady = !photoRequired || Boolean(photo);

  const steps = useMemo<CaptureStep[]>(() => {
    if (!event) return ["event"];
    return ["event", ...(event.dynamic_qr_required ? (["qr"] as CaptureStep[]) : []), ...(photoRequired ? (["photo"] as CaptureStep[]) : []), "review"];
  }, [event, photoRequired]);

  const stepIndex = Math.max(0, steps.indexOf(step));
  const canSubmit = eventReady && locationReady && qrReady && photoReady && !submitting;

  function goNext() {
    const nextStep = steps[stepIndex + 1];
    if (nextStep) setStep(nextStep);
  }

  function goBack() {
    const previousStep = steps[stepIndex - 1];
    if (previousStep) setStep(previousStep);
  }

  async function refreshLocation() {
    try {
      const fresh = await requestFreshLocation();
      setLocation(fresh);
      const result = event ? evaluateLocationForEvent(event, fresh) : null;
      const mockedWarning = fresh.mocked ? " Mock-location warning will be sent for review." : "";
      setMessage(`${result?.reason ?? "Location captured."}${mockedWarning}`);
      return Boolean(result?.accuracyOk && result.inside);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to get location.");
      return false;
    }
  }

  async function prepareAttendance() {
    setMessage("Checking your live location…");
    const ready = await refreshLocation();
    if (ready) goNext();
  }

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (!qrToken && result.data) {
      setQrToken(result.data);
      setMessage("Dynamic QR code scanned.");
    }
  }

  async function capturePhoto() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setMessage("Camera permission is required for the live attendance photo.");
        return;
      }
    }

    setCapturingPhoto(true);
    try {
      const picture = await cameraRef.current?.takePictureAsync({
        quality: 0.82,
        skipProcessing: false
      });

      if (!picture?.uri) throw new Error("Unable to capture attendance photo.");
      const compressed = await compressAttendancePhoto(picture.uri);
      setPhoto(compressed);
      setMessage("Live attendance photo captured.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to capture attendance photo.");
    } finally {
      setCapturingPhoto(false);
    }
  }

  async function submit() {
    if (!event || !location || !locationResult || !deviceId || !canSubmit) return;

    setSubmitting(true);
    try {
      const localId = createLocalId(mode);
      const now = new Date().toISOString();
      const idempotencyKey = createIdempotencyKey([event.id, deviceId, mode, localId]);
      const recordedStatus: AttendanceStatus = mode === "time_in" ? "time_in_recorded" : "completed";

      await saveLocalAttendance({
        local_id: localId,
        event_id: event.id,
        mode,
        status: recordedStatus,
        sync_status: "pending_upload",
        device_timestamp: now,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy_meters: location.accuracy,
        distance_meters: locationResult.distanceMeters,
        ...(photo ? { photo_local_uri: photo.uri, photo_hash: photo.hash } : {}),
        qr_token: qrToken ?? undefined,
        device_id: deviceId,
        idempotency_key: idempotencyKey,
        is_offline_submission: !online,
        retry_count: 0,
        created_at: now,
        updated_at: now
      });

      if (online) {
        await syncPendingAttendance();
        const body = "Your attendance was submitted with location and photo proof.";
        setMessage(body);
        setSubmissionResult({
          localId,
          status: recordedStatus,
          submittedAt: now,
          title: `${mode === "time_in" ? "Time In" : "Time Out"} recorded`,
          body
        });
      } else {
        const body = "Attendance was saved on this phone and will upload when internet is available.";
        setMessage(body);
        setSubmissionResult({
          localId,
          status: recordedStatus,
          submittedAt: now,
          title: `${mode === "time_in" ? "Time In" : "Time Out"} recorded offline`,
          body
        });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save attendance.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!event) {
    return (
      <View className="flex-1 bg-slate-50 p-5">
        <EmptyState title="Event not found" body="Open the event while online so it can be cached locally." />
      </View>
    );
  }

  const modeLabel = mode === "time_in" ? "Time In" : "Time Out";
  const eventDisabledReason = !deviceId
    ? "This phone is not registered for attendance. Log in again to register this device."
    : !scheduleOpen
      ? `${modeLabel} is disabled because the attendance window is not open. Current phone time must be inside ${attendanceWindowLabel(event, mode)}.`
      : mode === "time_out" && !timeOutDurationOk
        ? `Time out is disabled until the minimum attendance duration is reached. ${formatDurationMinutes(remainingMinimumMinutes)} remaining.`
        : null;
  const stepTitle =
    step === "event"
      ? `${modeLabel} Details`
      : step === "qr"
          ? "Scan Event QR"
          : step === "photo"
            ? "Take Live Photo"
            : "Review and Submit";
  const stepSubtitle =
    step === "event"
      ? "Confirm this is the correct event before starting attendance."
      : step === "qr"
          ? "Scan the QR code displayed by the event marshal."
          : step === "photo"
            ? "Take a live photo for this specific event. Gallery uploads are not allowed."
            : "Check the captured evidence before submitting attendance.";

  if (submissionResult) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 p-5 pb-10">
        <View className="items-center rounded-3xl bg-brand-900 p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Ionicons name="checkmark" size={34} color="#0f766e" />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-white">{submissionResult.title}</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-brand-50">{submissionResult.body}</Text>
        </View>

        <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
          <View className="mb-3 flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold uppercase text-brand-700">{modeLabel}</Text>
              <Text className="mt-1 text-xl font-bold text-slate-950">{event.title}</Text>
              <Text className="mt-1 text-sm text-slate-500">{event.location?.venue_name ?? "Venue pending"}</Text>
            </View>
            <StatusBadge status={submissionResult.status} />
          </View>
          <InfoRow label="Submitted" value={formatDateTime(submissionResult.submittedAt)} />
          <InfoRow label="Local record" value={submissionResult.localId} />
          <InfoRow label="Distance" value={formatDistance(locationResult?.distanceMeters)} />
          <InfoRow label="GPS accuracy" value={location ? `${Math.round(location.accuracy)} m` : "Not checked"} />
        </View>

        <SubmissionTimeline online={online} />

        <View className="gap-3">
          <PrimaryButton
            title="Back to Event"
            variant="secondary"
            icon={<Ionicons name="arrow-back" size={18} color="#ffffff" />}
            onPress={() => router.replace(`/event/${event.id}`)}
          />
          <PrimaryButton
            title="View History"
            variant="light"
            icon={<Ionicons name="time-outline" size={18} color="#020617" />}
            onPress={() => router.replace("/(student)/attendance")}
          />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 p-5 pb-10">
      <StepHeader title={stepTitle} subtitle={stepSubtitle} stepIndex={stepIndex} totalSteps={steps.length} />

      {step === "event" ? (
        <View className="gap-4">
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-bold uppercase text-brand-700">{modeLabel}</Text>
                <Text className="mt-1 text-xl font-bold text-slate-950">{event.title}</Text>
                <Text className="mt-1 text-sm text-slate-500">{event.location?.venue_name ?? "Venue pending"}</Text>
              </View>
              <StatusBadge status={mode === "time_in" ? "eligible_to_check_in" : "time_out_required"} />
            </View>
            <View className="mt-4">
              <InfoRow label="Event schedule" value={event.schedule ? formatDateTime(event.schedule.starts_at) : "Schedule pending"} />
              <InfoRow label="Current phone time" value={formatDateTime(new Date().toISOString())} />
              <InfoRow label={mode === "time_in" ? "Time-in window" : "Time-out window"} value={attendanceWindowLabel(event, mode)} />
              <InfoRow label="Photo evidence" value={photoRequired ? "Required" : "Not required"} />
              <InfoRow label="Dynamic QR" value={event.dynamic_qr_required ? "Required" : "Not required"} />
            </View>
          </View>

          {mode === "time_out" ? (
            <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="font-semibold text-slate-950">Time-out Readiness</Text>
              <View className="mt-2">
                <InfoRow label="Time-in timestamp" value={timeInRecord ? formatDateTime(timeInRecord.device_timestamp) : "No local time-in found"} />
                <InfoRow label="Minimum required duration" value={formatDurationMinutes(event.minimum_attendance_minutes)} />
                <InfoRow label="Remaining minimum duration" value={formatDurationMinutes(remainingMinimumMinutes)} />
                <InfoRow label="Remaining event duration" value={formatDurationMinutes(remainingEventMinutes)} />
              </View>
            </View>
          ) : null}

          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <Text className="font-semibold text-slate-950">Before You Continue</Text>
            <View className="mt-2">
              <ChecklistRow label="Registered device" done={Boolean(deviceId)} />
              <ChecklistRow label="Attendance window is open" done={scheduleOpen} />
              <ChecklistRow label="Inside the attendance area" done={locationReady} />
              {mode === "time_out" ? <ChecklistRow label="Minimum attendance duration reached" done={timeOutDurationOk} /> : null}
            </View>
            {eventDisabledReason ? <Text className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">{eventDisabledReason}</Text> : null}
          </View>

          <View className="rounded-2xl bg-brand-50 p-4">
            <Text className="font-semibold text-brand-900">Location is checked only for attendance</Text>
            <Text className="mt-1 text-sm leading-5 text-brand-900">Continue to capture a fresh GPS reading. It verifies that you are at the event venue.</Text>
          </View>
          {message !== "Start by confirming the event and attendance window." ? <Text accessibilityLiveRegion="polite" className={`rounded-2xl p-3 text-sm font-semibold ${locationReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{message}</Text> : null}
          <PrimaryButton title={location ? "Retry location" : `Check location & start ${modeLabel}`} disabled={!eventReady} onPress={() => void prepareAttendance()} />
        </View>
      ) : null}

      {step === "qr" ? (
        <View className="gap-4">
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <Text className="font-semibold text-slate-950">Dynamic QR</Text>
            <Text className="mt-2 text-sm text-slate-600">{qrToken ? "QR code scanned. Continue to the next step." : "Point the camera at the QR code shown by the event marshal."}</Text>
          </View>

          <View className="overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-sm">
            {permission?.granted ? (
              <CameraView ref={cameraRef} style={{ height: 340 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={!qrToken ? handleBarcodeScanned : undefined} />
            ) : (
              <View className="h-80 items-center justify-center bg-slate-900 p-5">
                <Text className="text-center text-white">Camera permission is required to scan the event QR code.</Text>
                <View className="mt-4 w-full">
                  <PrimaryButton title="Allow Scanner" onPress={() => void requestPermission()} />
                </View>
              </View>
            )}
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton title="Back" variant="light" onPress={goBack} />
            </View>
            <View className="flex-1">
              <PrimaryButton title="Next" disabled={!qrToken} onPress={goNext} />
            </View>
          </View>
        </View>
      ) : null}

      {step === "photo" ? (
        <View className="gap-4">
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <Text className="font-semibold text-slate-950">{event.title}</Text>
            <Text className="mt-2 text-sm text-slate-600">Take one live attendance photo for this {modeLabel.toLowerCase()} record.</Text>
          </View>

          <View className="overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-sm">
            {photo ? (
              <Image source={{ uri: photo.uri }} className="h-96 w-full" resizeMode="cover" />
            ) : permission?.granted ? (
              <CameraView ref={cameraRef} style={{ height: 390 }} facing="front" />
            ) : (
              <View className="h-80 items-center justify-center bg-slate-900 p-5">
                <Text className="text-center text-white">Camera permission is required for the live attendance photo.</Text>
                <View className="mt-4 w-full">
                  <PrimaryButton title="Allow Camera" onPress={() => void requestPermission()} />
                </View>
              </View>
            )}
          </View>

          <PrimaryButton title={photo ? "Retake Photo" : "Take Photo"} variant={photo ? "secondary" : "primary"} loading={capturingPhoto} onPress={() => (photo ? setPhoto(null) : void capturePhoto())} />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton title="Back" variant="light" onPress={goBack} />
            </View>
            <View className="flex-1">
              <PrimaryButton title="Next" disabled={!photoReady} onPress={goNext} />
            </View>
          </View>
        </View>
      ) : null}

      {step === "review" ? (
        <View className="gap-4">
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <Text className="text-lg font-bold text-slate-950">Review Evidence</Text>
            <View className="mt-3">
              <ChecklistRow label="Event and schedule confirmed" done={eventReady} />
              <ChecklistRow label="Inside attendance area" done={locationReady} />
              <ChecklistRow label="Dynamic QR complete" done={qrReady} />
              <ChecklistRow label="Live photo complete" done={photoReady} />
            </View>
          </View>

          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <InfoRow label="Event" value={event.title} />
            <InfoRow label="Mode" value={modeLabel} />
            <InfoRow label="Distance" value={formatDistance(locationResult?.distanceMeters)} />
            <InfoRow label="GPS accuracy" value={location ? `${Math.round(location.accuracy)} m` : "Not checked"} />
            <InfoRow label="Sync status" value={online ? "Upload after submit" : "Save offline"} />
          </View>

          {photo ? <Image source={{ uri: photo.uri }} className="h-64 w-full rounded-3xl bg-slate-200" resizeMode="cover" /> : null}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton title="Back" variant="light" disabled={submitting} onPress={goBack} />
            </View>
            <View className="flex-1">
              <PrimaryButton title="Submit" loading={submitting} disabled={!canSubmit} onPress={submit} />
            </View>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
