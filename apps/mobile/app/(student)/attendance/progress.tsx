import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { MetricCard } from "../../../src/components/MetricCard";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { useEvents } from "../../../src/hooks/useEvents";
import { getAttendanceHistory } from "../../../src/repositories/attendanceRepository";
import { formatDurationMinutes } from "@attendance/shared-utils";
import { getEventPhase, makeEventMap } from "../../../src/utils/events";
import { useNow } from "../../../src/hooks/useNow";
import { LoadingState } from "../../../src/components/ScreenState";

export default function AttendanceProgressScreen() {
  const query = useQuery({ queryKey: ["attendance-history"], queryFn: getAttendanceHistory });
  const eventsQuery = useEvents();
  const rows = query.data ?? [];
  const events = eventsQuery.data ?? [];
  const now = useNow();
  const eventMap = makeEventMap(events);
  const completedRequiredEvents = events.filter((event) => event.requirement === "required" && getEventPhase(event, now) === "completed");
  const completedRequiredIds = new Set(completedRequiredEvents.map((event) => event.id));
  const resolvedTimeIns = rows.filter((row) => row.mode === "time_in" && completedRequiredIds.has(row.event_id));
  const verifiedIds = new Set(resolvedTimeIns.filter((row) => ["verified", "completed", "time_in_recorded", "pending_verification"].includes(row.status)).map((row) => row.event_id));
  const lateIds = new Set(resolvedTimeIns.filter((row) => row.status === "late").map((row) => row.event_id));
  const excusedIds = new Set(resolvedTimeIns.filter((row) => row.status === "excused").map((row) => row.event_id));
  const creditedIds = new Set([...verifiedIds, ...lateIds, ...excusedIds]);
  const attendedIds = new Set([...verifiedIds, ...lateIds]);
  const attended = attendedIds.size;
  const late = lateIds.size;
  const excused = excusedIds.size;
  const missed = Math.max(0, completedRequiredEvents.length - creditedIds.size);
  const percentage = completedRequiredEvents.length ? Math.round((creditedIds.size / completedRequiredEvents.length) * 100) : null;
  const completedMinutes = Array.from(attendedIds).reduce((sum, eventId) => sum + (eventMap.get(eventId)?.minimum_attendance_minutes ?? 0), 0);
  const requiredMinutes = events
    .filter((event) => event.requirement === "required")
    .reduce((sum, event) => sum + (event.minimum_attendance_minutes ?? 0), 0);
  const monthlyBuckets = completedRequiredEvents.reduce<Record<string, { total: number; counted: number }>>((acc, event) => {
    const date = new Date(event.schedule?.starts_at ?? event.created_at);
    const key = date.toLocaleDateString(undefined, { month: "short" });
    acc[key] ??= { total: 0, counted: 0 };
    acc[key].total += 1;
    if (creditedIds.has(event.id)) acc[key].counted += 1;
    return acc;
  }, {});
  const monthlyValues = Object.entries(monthlyBuckets).slice(-6);
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;

  if ((query.isLoading && !query.data) || (eventsQuery.isLoading && !eventsQuery.data)) return <LoadingState label="Loading attendance progress" />;

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-5 p-5 pb-44">
      {query.isError || eventsQuery.isError ? (
        <View accessibilityRole="alert" className="rounded-2xl bg-red-50 p-4" style={contentStyle}>
          <Text className="text-sm text-red-700">Some progress data could not be refreshed.</Text>
          <Pressable accessibilityRole="button" onPress={() => void Promise.all([query.refetch(), eventsQuery.refetch()])}>
            <Text className="mt-2 font-bold text-red-800">Try again</Text>
          </Pressable>
        </View>
      ) : null}
      <View className="rounded-3xl bg-brand-900 p-5 shadow-sm" style={contentStyle}>
        <Text className="text-sm font-semibold text-brand-50">Attendance percentage</Text>
        <Text className="mt-2 text-5xl font-bold text-white">{percentage == null ? "—" : `${percentage}%`}</Text>
        {percentage == null ? <Text className="mt-2 text-sm text-brand-100">No completed required events yet.</Text> : null}
        <View className="mt-5">
          <ProgressBar value={percentage ?? 0} trackClassName="bg-white/20" fillClassName="bg-white" />
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3" style={contentStyle}>
        <MetricCard label="Events attended" value={attended} tone="good" icon={<Ionicons name="checkmark-circle" size={16} color="#0f766e" />} />
        <MetricCard label="Events missed" value={missed} tone={missed > 0 ? "danger" : "default"} icon={<Ionicons name="close-circle" size={16} color="#dc2626" />} />
        <MetricCard label="Late events" value={late} tone="warn" icon={<Ionicons name="time" size={16} color="#c2410c" />} />
        <MetricCard label="Excused absences" value={excused} icon={<Ionicons name="document-text" size={16} color="#0f766e" />} />
        <MetricCard label="Completed hours" value={Math.round(completedMinutes / 60)} subtitle={formatDurationMinutes(completedMinutes)} />
        <MetricCard label="Required hours" value={Math.round(requiredMinutes / 60)} subtitle={formatDurationMinutes(requiredMinutes)} />
      </View>
      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <SectionHeader title="Monthly Attendance" subtitle="Last active months" />
        <View className="mt-4 flex-row items-end gap-2">
          {monthlyValues.map(([label, bucket]) => {
            const value = Math.round((bucket.counted / Math.max(bucket.total, 1)) * 100);
            return (
            <View key={label} className="flex-1 items-center gap-2">
              <View className="w-full justify-end rounded-md bg-slate-100" style={{ height: 112 }}>
                <View className="w-full rounded-t-md bg-brand-600" style={{ height: Math.max(16, value) }} />
              </View>
              <Text className="text-xs font-medium text-slate-500">{label}</Text>
              <Text className="text-xs text-slate-400">{value}%</Text>
            </View>
            );
          })}
          {!monthlyValues.length ? <Text className="flex-1 py-8 text-center text-sm text-slate-500">Monthly results will appear after a required event is completed.</Text> : null}
        </View>
      </View>
    </ScrollView>
  );
}
