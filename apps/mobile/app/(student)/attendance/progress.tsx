import { ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { MetricCard } from "../../../src/components/MetricCard";
import { ProgressBar } from "../../../src/components/ProgressBar";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { useEvents } from "../../../src/hooks/useEvents";
import { getAttendanceHistory } from "../../../src/repositories/attendanceRepository";
import { formatDurationMinutes } from "@attendance/shared-utils";
import { getEventPhase, isAttendanceCounted, makeEventMap } from "../../../src/utils/events";

export default function AttendanceProgressScreen() {
  const query = useQuery({ queryKey: ["attendance-history"], queryFn: getAttendanceHistory });
  const eventsQuery = useEvents();
  const rows = query.data ?? [];
  const events = eventsQuery.data ?? [];
  const eventMap = makeEventMap(events);
  const verified = rows.filter((row) => isAttendanceCounted(row.status)).length;
  const late = rows.filter((row) => row.status === "late").length;
  const excused = rows.filter((row) => row.status === "excused").length;
  const completedRequired = events.filter((event) => event.requirement === "required" && getEventPhase(event) === "completed").length;
  const missed = Math.max(rows.filter((row) => row.status === "missed").length, completedRequired - verified);
  const total = Math.max(verified + missed, 1);
  const percentage = Math.round(((verified + late + excused) / total) * 100);
  const completedMinutes = rows
    .filter((row) => isAttendanceCounted(row.status))
    .reduce((sum, row) => sum + (eventMap.get(row.event_id)?.minimum_attendance_minutes || 90), 0);
  const requiredMinutes = events
    .filter((event) => event.requirement === "required")
    .reduce((sum, event) => sum + (event.minimum_attendance_minutes || 90), 0);
  const monthlyBuckets = rows.reduce<Record<string, { total: number; counted: number }>>((acc, row) => {
    const date = new Date(row.device_timestamp);
    const key = date.toLocaleDateString(undefined, { month: "short" });
    acc[key] ??= { total: 0, counted: 0 };
    acc[key].total += 1;
    if (isAttendanceCounted(row.status)) acc[key].counted += 1;
    return acc;
  }, {});
  const monthlyValues = Object.entries(monthlyBuckets).slice(-6);
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="gap-5 p-5 pb-44">
      <View className="rounded-3xl bg-brand-900 p-5 shadow-sm" style={contentStyle}>
        <Text className="text-sm font-semibold text-brand-50">Attendance percentage</Text>
        <Text className="mt-2 text-5xl font-bold text-white">{percentage}%</Text>
        <View className="mt-5">
          <ProgressBar value={percentage} trackClassName="bg-white/20" fillClassName="bg-white" />
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3" style={contentStyle}>
        <MetricCard label="Events attended" value={verified} tone="good" icon={<Ionicons name="checkmark-circle" size={16} color="#0f766e" />} />
        <MetricCard label="Events missed" value={missed} tone={missed > 0 ? "danger" : "default"} icon={<Ionicons name="close-circle" size={16} color="#dc2626" />} />
        <MetricCard label="Late events" value={late} tone="warn" icon={<Ionicons name="time" size={16} color="#c2410c" />} />
        <MetricCard label="Excused absences" value={excused} icon={<Ionicons name="document-text" size={16} color="#0f766e" />} />
        <MetricCard label="Completed hours" value={Math.round(completedMinutes / 60)} subtitle={formatDurationMinutes(completedMinutes)} />
        <MetricCard label="Required hours" value={Math.round(requiredMinutes / 60)} subtitle={formatDurationMinutes(requiredMinutes)} />
      </View>
      <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
        <SectionHeader title="Monthly Attendance" subtitle="Last active months" />
        <View className="mt-4 flex-row items-end gap-2">
          {(monthlyValues.length ? monthlyValues : [["Now", { total: 1, counted: percentage > 0 ? 1 : 0 }] as const]).map(([label, bucket]) => {
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
        </View>
      </View>
    </ScrollView>
  );
}
