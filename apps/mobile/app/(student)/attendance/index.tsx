import { useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { EmptyState, LoadingState } from "../../../src/components/ScreenState";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { SegmentedFilter, type SegmentOption } from "../../../src/components/SegmentedFilter";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { useEvents } from "../../../src/hooks/useEvents";
import { getAttendanceHistory } from "../../../src/repositories/attendanceRepository";
import { formatDateTime } from "../../../src/utils/format";
import { makeEventMap, needsAttention } from "../../../src/utils/events";

const filters = ["all", "verified", "late", "missed", "rejected", "excused", "review"] as const;
type AttendanceFilter = (typeof filters)[number];

function getReason(serverPayload?: string | null, fallback?: string | null) {
  if (fallback) return fallback;
  if (!serverPayload) return "Submitted from this device. Server details will appear after sync.";
  try {
    const parsed = JSON.parse(serverPayload) as { verification_reason?: string };
    return parsed.verification_reason ?? "Submitted from this device. Server details will appear after sync.";
  } catch {
    return "Submitted from this device. Server details will appear after sync.";
  }
}

export default function AttendanceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["attendance-history"], queryFn: getAttendanceHistory });
  const eventsQuery = useEvents();
  const eventMap = useMemo(() => makeEventMap(eventsQuery.data ?? []), [eventsQuery.data]);
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;

  const data = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    const rows = query.data ?? [];
    return rows.filter((row) => {
      const event = eventMap.get(row.event_id);
      const statusMatch =
        filter === "all" ||
        (filter === "review" ? needsAttention(row.sync_status) || needsAttention(row.status) : row.status === filter);

      if (!statusMatch) return false;
      if (!searchValue) return true;

      return `${event?.title ?? row.event_id} ${row.mode} ${row.status} ${formatDateTime(row.device_timestamp)}`
        .toLowerCase()
        .includes(searchValue);
    });
  }, [eventMap, filter, query.data, search]);

  const filterOptions = useMemo<SegmentOption<AttendanceFilter>[]>(() => {
    const rows = query.data ?? [];
    return filters.map((item) => ({
      value: item,
      label: item.charAt(0).toUpperCase() + item.slice(1),
      count:
        item === "all"
          ? rows.length
          : rows.filter((row) => (item === "review" ? needsAttention(row.sync_status) || needsAttention(row.status) : row.status === item)).length
    }));
  }, [query.data]);

  if (query.isLoading) return <LoadingState label="Loading attendance history" />;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      {/* Top Header Card with Safe Area Insets to avoid phone notification bar */}
      <View
        className="bg-white border-b border-slate-100 shadow-sm"
        style={{ paddingTop: Math.max(insets.top + 10, 20) }}
      >
        <View className="gap-3 px-5 pb-3.5" style={contentStyle}>
          <SectionHeader title="Attendance" subtitle={`${query.data?.length ?? 0} total records`} />
          <View className="min-h-12 flex-row items-center rounded-full border border-slate-200/80 bg-slate-50 px-4 shadow-sm">
            <Ionicons name="search-outline" size={19} color="#0f766e" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by event, date, or status"
              placeholderTextColor="#94a3b8"
              className="min-h-12 flex-1 px-3 text-sm text-slate-950"
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch("")} className="p-1">
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>
          <SegmentedFilter options={filterOptions} value={filter} onChange={setFilter} />
        </View>
      </View>

      <FlashList
        data={data}
        refreshControl={<RefreshControl refreshing={query.isRefetching || eventsQuery.isRefetching} onRefresh={() => void Promise.all([query.refetch(), eventsQuery.refetch()])} tintColor="#0f766e" />}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(220, insets.bottom + 140)
        }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={<EmptyState title="No attendance records" body="Records appear here after time-in or time-out." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/(student)/attendance/${item.local_id}`)} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="font-semibold text-slate-950">{eventMap.get(item.event_id)?.title ?? "Event"}</Text>
                <Text className="mt-1 text-sm text-slate-600">{item.mode === "time_in" ? "Time In" : "Time Out"} · {formatDateTime(item.device_timestamp)}</Text>
                <Text className="mt-1 text-sm text-slate-500">Distance: {item.distance_meters ? `${Math.round(item.distance_meters)} m` : "Not available"}</Text>
                <Text className="mt-1 text-sm text-slate-500" numberOfLines={2}>
                  {getReason(item.server_payload)}
                </Text>
              </View>
              <StatusBadge status={needsAttention(item.sync_status) ? item.sync_status : item.status || item.sync_status} />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
