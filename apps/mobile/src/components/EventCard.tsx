import { Image, Pressable, Text, View } from "react-native";
import type { Event } from "@attendance/types";
import { formatDistance } from "@attendance/shared-utils";
import { Ionicons } from "@expo/vector-icons";
import { StatusBadge } from "./StatusBadge";
import { formatEventSchedule, formatTimeRange } from "../utils/format";
import { getEventAttendanceStatus } from "../utils/events";

function DetailRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-50">
        <Ionicons name={icon} size={14} color="#0f766e" />
      </View>
      <Text className="min-w-0 flex-1 text-sm text-slate-600" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function MiniBadge({ label, tone = "default" }: { label: string; tone?: "default" | "required" | "qr" }) {
  const styles = tone === "required" ? "bg-brand-50 text-brand-800" : tone === "qr" ? "bg-sky-50 text-sky-800" : "bg-slate-50 text-slate-700";

  return (
    <View className={`rounded-full px-3 py-1 ${styles.split(" ")[0]}`}>
      <Text className={`text-xs font-bold ${styles.split(" ")[1]}`}>{label}</Text>
    </View>
  );
}

export function EventCard({ event, onPress, compact = false }: { event: Event; onPress?: () => void; compact?: boolean }) {
  const status = getEventAttendanceStatus(event);

  return (
    <Pressable onPress={onPress} className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm active:bg-slate-50">
      <View className="flex-row items-start gap-3">
        <Image
          source={{ uri: event.banner_path || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400" }}
          className={`${compact ? "h-20 w-20" : "h-28 w-24"} rounded-2xl bg-slate-200`}
        />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold leading-5 text-slate-950" numberOfLines={2}>
                {event.title}
              </Text>
              <Text className="mt-1 text-xs font-semibold uppercase text-slate-400" numberOfLines={1}>
                {event.type || "School Event"}
              </Text>
            </View>
            <StatusBadge status={status} />
          </View>
          <View className="mt-3 gap-2">
            <DetailRow icon="calendar-outline" text={formatEventSchedule(event)} />
            {!compact && event.schedule ? (
              <DetailRow icon="time-outline" text={`Time in ${formatTimeRange(event.schedule.check_in_opens_at, event.schedule.check_in_closes_at)}`} />
            ) : null}
            <DetailRow icon="location-outline" text={event.location?.venue_name ?? "Venue pending"} />
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <MiniBadge label={event.requirement === "required" ? "Required" : "Optional"} tone={event.requirement === "required" ? "required" : "default"} />
            <MiniBadge label={formatDistance(event.distance_meters)} />
            {event.dynamic_qr_required ? <MiniBadge label="QR" tone="qr" /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
