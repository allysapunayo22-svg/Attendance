import { useState } from "react";
import { Image, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { formatDistance } from "@attendance/shared-utils";
import { InfoRow } from "../../../../src/components/InfoRow";
import { PrimaryButton } from "../../../../src/components/PrimaryButton";
import { SectionHeader } from "../../../../src/components/SectionHeader";
import { LoadingState } from "../../../../src/components/ScreenState";
import { StatusBadge } from "../../../../src/components/StatusBadge";
import { useEvents } from "../../../../src/hooks/useEvents";
import { getAttendanceByLocalId } from "../../../../src/repositories/attendanceRepository";
import { syncPendingAttendance } from "../../../../src/services/syncQueue";
import { formatDateTime } from "../../../../src/utils/format";
import { makeEventMap, needsAttention } from "../../../../src/utils/events";

function parseServerPayload(payload?: string | null) {
  if (!payload) return null;
  try {
    return JSON.parse(payload) as { verification_reason?: string; suspicious_flags?: string[] };
  } catch {
    return null;
  }
}

function getStudentFacingSyncLabel(syncStatus?: string | null) {
  if (syncStatus === "pending_upload") return "Saved on phone";
  if (syncStatus === "pending_verification" || syncStatus === "uploaded" || syncStatus === "verified") return "Uploaded";
  if (syncStatus === "uploading") return "Uploading";
  if (syncStatus === "failed") return "Failed";
  if (syncStatus === "requires_review") return "Requires review";
  return syncStatus ?? "Submitted";
}

function EvidenceTile({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View className="min-w-[46%] flex-1 rounded-2xl bg-slate-50 p-4">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
        <Ionicons name={icon} size={17} color="#0f766e" />
      </View>
      <Text className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</Text>
      <Text className="mt-1 text-base font-bold text-slate-950" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function AttendanceDetailsScreen() {
  const { width } = useWindowDimensions();
  const [retrying, setRetrying] = useState(false);
  const { localId } = useLocalSearchParams<{ localId: string }>();
  const query = useQuery({
    queryKey: ["attendance-detail", localId],
    queryFn: () => getAttendanceByLocalId(localId)
  });
  const eventsQuery = useEvents();

  const record = query.data;

  if (query.isLoading) return <LoadingState label="Loading attendance details" />;

  if (!record) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-5">
        <Text className="text-slate-600">Attendance record not found.</Text>
      </View>
    );
  }

  const event = makeEventMap(eventsQuery.data ?? []).get(record.event_id);
  const serverPayload = parseServerPayload(record.server_payload);
  const verificationReason = serverPayload?.verification_reason ?? "Submitted from this device. Server details will appear after sync.";
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;
  const cardWidth = Math.min(width - 40, 620);
  const photoHeight = Math.min(360, Math.max(220, cardWidth * 0.72));

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-4 p-5 pb-64">
      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-bold uppercase tracking-wide text-brand-700">{record.mode === "time_in" ? "Time In" : "Time Out"}</Text>
            <Text className="mt-1 text-xl font-bold text-slate-950" numberOfLines={2}>
              {event?.title ?? (record.mode === "time_in" ? "Time In" : "Time Out")}
            </Text>
            <Text className="mt-2 text-sm font-semibold text-slate-500">{formatDateTime(record.device_timestamp)}</Text>
          </View>
          <StatusBadge status={needsAttention(record.sync_status) ? record.sync_status : record.status || record.sync_status} />
        </View>
      </View>

      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <SectionHeader title="Event Information" />
        <View className="mt-3">
          <InfoRow label="Event" value={event?.title ?? record.event_id} icon={<Ionicons name="calendar-outline" size={16} color="#0f766e" />} />
          <InfoRow label="Venue" value={event?.location?.venue_name ?? "Venue pending"} icon={<Ionicons name="location-outline" size={16} color="#0f766e" />} />
          <View className="mt-2 self-start rounded-full bg-brand-50 px-4 py-2">
            <Text className="text-sm font-bold text-brand-900">{event?.requirement === "required" ? "Required" : "Optional"}</Text>
          </View>
        </View>
      </View>

      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <SectionHeader title="Location Evidence" />
        <View className="mt-3 flex-row flex-wrap gap-3">
          <EvidenceTile label="Latitude" value={record.latitude != null ? Number(record.latitude).toFixed(6) : "-"} icon="navigate-outline" />
          <EvidenceTile label="Longitude" value={record.longitude != null ? Number(record.longitude).toFixed(6) : "-"} icon="navigate-circle-outline" />
          <EvidenceTile label="Distance" value={formatDistance(record.distance_meters)} icon="location-outline" />
          <EvidenceTile label="GPS Accuracy" value={record.accuracy_meters ? `${Math.round(record.accuracy_meters)} m` : "-"} icon="radio-outline" />
        </View>
      </View>

      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <SectionHeader title="Verification" action={<StatusBadge status={needsAttention(record.sync_status) ? record.sync_status : record.status} />} />
        <View className="mt-3 rounded-2xl bg-slate-50 p-4">
          <InfoRow label="Upload status" value={getStudentFacingSyncLabel(record.sync_status)} />
          <InfoRow label="Photo storage path" value={record.photo_storage_path ?? "Saved on phone"} />
          {record.last_error ? <InfoRow label="Last upload error" value={record.last_error} /> : null}
          <InfoRow label="Reason" value={verificationReason} />
          <InfoRow label="Review flags" value={serverPayload?.suspicious_flags?.length ? serverPayload.suspicious_flags.join(", ") : "None"} />
        </View>
      </View>

      {record.photo_local_uri ? (
        <View className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm" style={contentStyle}>
          <View className="mb-3 px-1">
            <SectionHeader title="Photo Evidence" subtitle="Live attendance capture" />
          </View>
          <Image
            source={{ uri: record.photo_local_uri }}
            resizeMode="cover"
            className="rounded-3xl bg-slate-200"
            style={{ width: "100%", height: photoHeight }}
          />
        </View>
      ) : null}

      {record.sync_status === "failed" || record.sync_status === "pending_upload" ? (
        <PrimaryButton
          title="Retry Upload"
          loading={retrying}
          style={contentStyle}
          onPress={async () => {
            setRetrying(true);
            try {
              await syncPendingAttendance();
              await query.refetch();
            } finally {
              setRetrying(false);
            }
          }}
        />
      ) : null}

      <PrimaryButton
        title="Appeal or Request Correction"
        variant="secondary"
        style={contentStyle}
        onPress={() => router.push({ pathname: "/appeal", params: { eventId: record.event_id, localId: record.local_id } })}
      />
    </ScrollView>
  );
}
