import { useMemo, useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { RefreshControl, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAnnouncements } from "../../../src/hooks/useEvents";
import { EmptyState, LoadingState } from "../../../src/components/ScreenState";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { SegmentedFilter, type SegmentOption } from "../../../src/components/SegmentedFilter";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { formatDateTime } from "../../../src/utils/format";

const filters = ["all", "urgent", "important", "normal"] as const;
type AnnouncementFilter = (typeof filters)[number];

export default function AnnouncementsScreen() {
  const [filter, setFilter] = useState<AnnouncementFilter>("all");
  const [search, setSearch] = useState("");
  const query = useAnnouncements();
  const announcements = query.data ?? [];
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return announcements.filter((announcement) => {
      const importanceMatch = filter === "all" || announcement.importance === filter;
      if (!importanceMatch) return false;
      if (!value) return true;
      return `${announcement.title} ${announcement.description}`.toLowerCase().includes(value);
    });
  }, [announcements, filter, search]);
  const filterOptions = useMemo<SegmentOption<AnnouncementFilter>[]>(() => {
    return filters.map((item) => ({
      value: item,
      label: item.charAt(0).toUpperCase() + item.slice(1),
      count: item === "all" ? announcements.length : announcements.filter((announcement) => announcement.importance === item).length
    }));
  }, [announcements]);

  if (query.isLoading && !query.data) return <LoadingState label="Loading announcements" />;

  return (
    <View className="flex-1 bg-slate-50">
      <View className="gap-4 p-5 pb-3" style={contentStyle}>
        <SectionHeader title="Announcements" subtitle={`${announcements.length} posts`} />
        <View className="min-h-12 flex-row items-center rounded-full border border-slate-100 bg-white px-4 shadow-sm">
          <Ionicons name="search-outline" size={20} color="#0f766e" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search announcements"
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
        ListEmptyComponent={<EmptyState title="No announcements" />}
        renderItem={({ item }) => (
          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={contentStyle}>
            <StatusBadge status={item.importance} />
            <Text className="mt-3 text-lg font-bold text-slate-950">{item.title}</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">{item.description}</Text>
            <View className="mt-3 flex-row items-center justify-between gap-3">
              <Text className="text-xs text-slate-400">{formatDateTime(item.publish_at)}</Text>
              <Text className="text-xs font-medium text-slate-500">{item.attachment_paths?.length ?? 0} attachment{item.attachment_paths?.length === 1 ? "" : "s"}</Text>
            </View>
            {item.event_id ? <Text className="mt-2 text-xs font-medium text-brand-700">Linked event: {item.event_id}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}
