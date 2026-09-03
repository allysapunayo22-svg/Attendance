import { useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventMapView } from "../../../src/components/EventMapView";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@attendance/types";
import { formatDistance, formatDurationMinutes } from "@attendance/shared-utils";
import { InfoRow } from "../../../src/components/InfoRow";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { getCachedEvent } from "../../../src/repositories/eventsRepository";
import { getLatestAttendanceForEvent } from "../../../src/repositories/attendanceRepository";
import { evaluateLocationForEvent, requestFreshLocation } from "../../../src/services/location";
import { formatDate, formatTime, formatTimeRange } from "../../../src/utils/format";
import { getEventPhase, getEventAttendanceStatus } from "../../../src/utils/events";

export default function EventDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [timeInRecord, setTimeInRecord] = useState<any | null>(null);
  const [timeOutRecord, setTimeOutRecord] = useState<any | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locationMessage, setLocationMessage] = useState("Location not checked.");

  useEffect(() => {
    if (id) {
      void getCachedEvent(id).then(setEvent);
      void getLatestAttendanceForEvent(id, "time_in").then((record) => setTimeInRecord(record ?? null));
      void getLatestAttendanceForEvent(id, "time_out").then((record) => setTimeOutRecord(record ?? null));
    }
  }, [id]);

  async function refreshDistance() {
    if (!event) return;
    const location = await requestFreshLocation();
    const result = evaluateLocationForEvent(event, {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy
    });
    setDistance(result.distanceMeters);
    setLocationMessage(result.reason);
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-5">
        <Text className="text-slate-600">Event not found in local cache.</Text>
      </View>
    );
  }

  const phase = getEventPhase(event);
  const isCompleted = phase === "completed";
  const isOngoing = phase === "ongoing";
  const attendanceStatus = getEventAttendanceStatus(event);
  const locationReady = distance != null;

  const region = event.location
    ? {
        latitude: event.location.latitude,
        longitude: event.location.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      }
    : undefined;

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerStyle={{
        padding: 20,
        gap: 16,
        paddingBottom: Math.max(160, insets.bottom + 80)
      }}
    >
      {/* Event Banner & Overview */}
      <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <Image
          source={{ uri: event.banner_path || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1000" }}
          className="h-48 w-full bg-slate-200"
        />
        <View className="p-5">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-2xl font-bold text-slate-950">{event.title}</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">{event.description}</Text>
            </View>
            <StatusBadge status={attendanceStatus} />
          </View>
          <View className="mt-4 flex-row flex-wrap gap-2">
            {[
              event.requirement === "required" ? "Required Attendance" : "Optional Attendance",
              event.dynamic_qr_required ? "QR Verification" : "No QR",
              event.photo_required ? "Photo Proof" : "No Photo"
            ].map((label) => (
              <View key={label} className="rounded-full bg-slate-100 px-3 py-1">
                <Text className="text-xs font-semibold text-slate-700">{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* COMPLETED EVENT HERO: Attendance Outcome Receipt */}
      {isCompleted ? (
        <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Outcome</Text>
              <Text className="mt-1 text-xl font-extrabold text-slate-950">
                {timeInRecord ? "Attendance Recorded" : "Missed Event"}
              </Text>
            </View>
            <StatusBadge
              status={
                timeOutRecord?.status ||
                timeInRecord?.status ||
                (timeInRecord ? "completed" : "missed")
              }
            />
          </View>

          {timeInRecord ? (
            <View className="mt-4 gap-2.5 rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200/60">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className="h-6 w-6 items-center justify-center rounded-full bg-emerald-600">
                    <Ionicons name="checkmark" size={14} color="#ffffff" />
                  </View>
                  <Text className="text-xs font-bold text-emerald-950">Check In</Text>
                </View>
                <Text className="text-xs font-extrabold text-emerald-900">
                  {formatTime(timeInRecord.device_timestamp)}
                </Text>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View className={`h-6 w-6 items-center justify-center rounded-full ${timeOutRecord ? "bg-emerald-600" : "bg-slate-300"}`}>
                    <Ionicons name={timeOutRecord ? "checkmark" : "time-outline"} size={14} color="#ffffff" />
                  </View>
                  <Text className="text-xs font-bold text-emerald-950">Check Out</Text>
                </View>
                <Text className="text-xs font-extrabold text-emerald-900">
                  {timeOutRecord ? formatTime(timeOutRecord.device_timestamp) : "No Time-out recorded"}
                </Text>
              </View>

              {timeOutRecord && timeInRecord ? (
                <View className="mt-1 flex-row items-center justify-between border-t border-emerald-200/60 pt-2.5">
                  <Text className="text-xs font-medium text-emerald-800">Duration Credited</Text>
                  <Text className="text-xs font-extrabold text-emerald-950">
                    {formatDurationMinutes(Math.max(0, Math.round((new Date(timeOutRecord.device_timestamp).getTime() - new Date(timeInRecord.device_timestamp).getTime()) / 60000)))}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View className="mt-4 gap-2 rounded-2xl bg-rose-50 p-4 border border-rose-200/60">
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={18} color="#e11d48" />
                <Text className="text-xs font-bold text-rose-900">No Attendance Recorded</Text>
              </View>
              <Text className="text-xs leading-5 text-rose-700">
                You did not record attendance during this event's schedule. If you had an excused absence or illness, you can submit an appeal to the CBEA office.
              </Text>
            </View>
          )}
        </View>
      ) : null}

      {/* Schedule Details */}
      <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Schedule" />
        <View className="mt-2">
          <InfoRow
            label="Date"
            value={event.schedule ? formatDate(event.schedule.event_date || event.schedule.starts_at, { weekday: "long" }) : "Pending"}
            icon={<Ionicons name="calendar-outline" size={16} color="#0f766e" />}
          />
          <InfoRow label="Event time" value={event.schedule ? formatTimeRange(event.schedule.starts_at, event.schedule.ends_at) : "Pending"} icon={<Ionicons name="time-outline" size={16} color="#0f766e" />} />
          <InfoRow label="Time-in period" value={event.schedule ? formatTimeRange(event.schedule.check_in_opens_at, event.schedule.check_in_closes_at) : "Pending"} />
          <InfoRow label="Late period ends" value={event.schedule?.late_ends_at ? formatTimeRange(event.schedule.check_in_closes_at, event.schedule.late_ends_at) : "No late period"} />
          <InfoRow label="Time-out period" value={event.schedule?.check_out_opens_at ? formatTimeRange(event.schedule.check_out_opens_at, event.schedule.check_out_closes_at ?? event.schedule.ends_at) : "At event end"} />
        </View>
      </View>

      {/* Map Preview */}
      {region ? (
        <EventMapView
          region={region}
          radiusMeters={event.location?.radius_meters ?? 100}
          venueName={event.location?.venue_name}
        />
      ) : null}

      {/* LIVE EVENT ONLY: Geofence and Eligibility check */}
      {!isCompleted ? (
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Attendance Eligibility" action={<StatusBadge status={locationReady ? "eligible_to_check_in" : "not_started"} />} />
          <View className="mt-2">
            <InfoRow label="Venue" value={event.location?.venue_name ?? "Venue pending"} icon={<Ionicons name="location-outline" size={16} color="#0f766e" />} />
            <InfoRow label="Allowed radius" value={`${event.location?.radius_meters ?? "-"} meters`} />
            <InfoRow label="Required GPS accuracy" value={`${event.location?.required_gps_accuracy_meters ?? "-"} meters`} />
            <InfoRow label="Your distance" value={formatDistance(distance)} />
            <InfoRow label="Registration" value="Assigned to your account" />
          </View>
          <Text className="mt-3 rounded-2xl bg-brand-50 p-3 text-sm font-medium text-brand-900">{locationMessage}</Text>
        </View>
      ) : null}

      {/* Verification Requirements */}
      <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <SectionHeader title="Verification Requirements" />
        <View className="mt-2">
          <InfoRow label="Live photo" value={event.photo_required ? "Required for time-in" : "Not required for time-in"} />
          <InfoRow label="Time-out photo" value={event.time_out_photo_required ? "Required for time-out" : "Not required for time-out"} />
          <InfoRow label="Dynamic QR" value={event.dynamic_qr_required ? "Required during attendance capture" : "Not required"} />
          <InfoRow label="Minimum duration" value={formatDurationMinutes(event.minimum_attendance_minutes)} />
        </View>
      </View>

      {/* Attendance Zones */}
      {event.zones?.length ? (
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <SectionHeader title="Attendance Zones" subtitle={`${event.zones.length} valid area${event.zones.length === 1 ? "" : "s"}`} />
          <View className="mt-3 gap-2">
            {event.zones.map((zone) => (
              <View key={zone.id} className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                <Text className="font-semibold text-slate-900">{zone.name}</Text>
                <Text className="mt-1 text-xs text-slate-500">{zone.zone_type === "circle" ? `Circle · ${zone.radius_meters ?? event.location?.radius_meters ?? "-"} m` : "Polygon boundary"}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* DYNAMIC ACTION BUTTONS */}
      {isCompleted ? (
        <View className="gap-3 pt-2">
          {timeInRecord ? (
            <PrimaryButton
              title="View Attendance Receipt"
              icon={<Ionicons name="receipt-outline" size={18} color="#ffffff" />}
              onPress={() => router.push(`/(student)/attendance/${timeInRecord.local_id}`)}
            />
          ) : (
            <PrimaryButton
              title="Submit Absence Appeal"
              icon={<Ionicons name="document-text-outline" size={18} color="#ffffff" />}
              onPress={() => router.push("/appeal")}
            />
          )}
          <PrimaryButton
            title="Back to Events"
            variant="light"
            icon={<Ionicons name="arrow-back" size={18} color="#0f172a" />}
            onPress={() => router.back()}
          />
        </View>
      ) : isOngoing ? (
        <View className="gap-3 pt-2">
          <PrimaryButton
            title="Refresh Live Location"
            variant="secondary"
            icon={<Ionicons name="navigate-outline" size={18} color="#ffffff" />}
            onPress={refreshDistance}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton
                title={timeInRecord ? "Time In (Done)" : "Time In"}
                disabled={Boolean(timeInRecord)}
                icon={<Ionicons name="log-in-outline" size={18} color="#ffffff" />}
                onPress={() => router.push(`/check-in/${event.id}`)}
              />
            </View>
            <View className="flex-1">
              <PrimaryButton
                title="Time Out"
                variant={timeInRecord && !timeOutRecord ? "primary" : "secondary"}
                disabled={!timeInRecord || Boolean(timeOutRecord)}
                icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
                onPress={() => router.push(`/check-out/${event.id}`)}
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-3 pt-2">
          <PrimaryButton
            title="Check Venue Location"
            variant="secondary"
            icon={<Ionicons name="navigate-outline" size={18} color="#ffffff" />}
            onPress={refreshDistance}
          />
          <PrimaryButton
            title="Back to Events"
            variant="light"
            icon={<Ionicons name="arrow-back" size={18} color="#0f172a" />}
            onPress={() => router.back()}
          />
        </View>
      )}
    </ScrollView>
  );
}
