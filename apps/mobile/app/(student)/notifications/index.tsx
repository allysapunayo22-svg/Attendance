import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FlashList } from "@shopify/flash-list";
import { RefreshControl, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NotificationRecord } from "@attendance/types";
import { EmptyState, LoadingState } from "../../../src/components/ScreenState";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { SegmentedFilter, type SegmentOption } from "../../../src/components/SegmentedFilter";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { supabase } from "../../../src/services/supabase";
import { formatDateTime } from "../../../src/utils/format";

const filters = ["all", "unread", "events", "attendance", "appeals"] as const;
type NotificationFilter = (typeof filters)[number];

async function fetchNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as NotificationRecord[];
}

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications });
  const notifications = query.data ?? [];
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const typeMatch =
        filter === "all" ||
        (filter === "unread" && !notification.read_at) ||
        (filter === "events" && ["event_reminder", "schedule_change", "event_cancelled", "check_in_open", "check_out_reminder"].includes(notification.type)) ||
        (filter === "attendance" && ["attendance_verified", "attendance_rejected"].includes(notification.type)) ||
        (filter === "appeals" && notification.type === "appeal_decision");

      if (!typeMatch) return false;
      if (!value) return true;
      return `${notification.title} ${notification.body}`.toLowerCase().includes(value);
    });
  }, [filter, notifications, search]);

  const filterOptions = useMemo<SegmentOption<NotificationFilter>[]>(() => {
    return filters.map((item) => ({
      value: item,
      label: item.charAt(0).toUpperCase() + item.slice(1),
      count:
        item === "all"
          ? notifications.length
          : notifications.filter((notification) => {
              if (item === "unread") return !notification.read_at;
              if (item === "events") return ["event_reminder", "schedule_change", "event_cancelled", "check_in_open", "check_out_reminder"].includes(notification.type);
              if (item === "attendance") return ["attendance_verified", "attendance_rejected"].includes(notification.type);
              return notification.type === "appeal_decision";
            }).length
    }));
  }, [notifications]);

  if (query.isLoading) return <LoadingState label="Loading notifications" />;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="gap-4 p-5 pb-3" style={contentStyle}>
        <SectionHeader title="Notifications" subtitle={`${notifications.length} recent alerts`} />
        <View className="min-h-12 flex-row items-center rounded-full border border-slate-100 bg-white px-4 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#0f766e" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search notifications"
            placeholderTextColor="#94a3b8"
            className="min-h-12 flex-1 px-3 text-base text-slate-950"
          />
        </View>
        <SegmentedFilter options={filterOptions} value={filter} onChange={setFilter} />
      </View>

      <FlashList
        data={filtered}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor="#0f766e" />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 164 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={<EmptyState title="No notifications" body="Event reminders and attendance decisions appear here." />}
        renderItem={({ item }) => (
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
            <View className="flex-row items-start justify-between gap-3">
              <Text className="min-w-0 flex-1 font-semibold text-slate-950">{item.title}</Text>
              <StatusBadge status={item.read_at ? "read" : "unread"} />
            </View>
            <Text className="mt-1 text-sm text-slate-600">{item.body}</Text>
            <Text className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</Text>
          </View>
        )}
      />
    </View>
  );
}
