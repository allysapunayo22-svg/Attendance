import { useMemo, useState } from "react";
import { Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { EventCard } from "../../../src/components/EventCard";
import { EmptyState, LoadingState } from "../../../src/components/ScreenState";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { SegmentedFilter, type SegmentOption } from "../../../src/components/SegmentedFilter";
import { useEvents } from "../../../src/hooks/useEvents";
import { useNow } from "../../../src/hooks/useNow";
import { getEventPhase, getEventSortTime } from "../../../src/utils/events";

const filters = ["all", "today", "upcoming", "past"] as const;
type EventFilter = (typeof filters)[number];

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<EventFilter>("all");
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [search, setSearch] = useState("");
  const eventsQuery = useEvents();
  const now = useNow();
  const allEvents = eventsQuery.data ?? [];
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;

  const ongoingEvent = useMemo(() => {
    return allEvents.find((event) => getEventPhase(event, now) === "ongoing");
  }, [allEvents, now]);

  const events = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allEvents
      .filter((event) => {
        const phase = getEventPhase(event, now);
        if (requiredOnly && event.requirement !== "required") return false;
        if (filter === "all") return true;
        if (filter === "today") return event.schedule ? new Date(event.schedule.starts_at).toDateString() === new Date(now).toDateString() : false;
        if (filter === "upcoming") return phase === "upcoming";
        return phase === "completed";
      })
      .filter((event) => {
        if (!query) return true;
        return `${event.title} ${event.description} ${event.location?.venue_name ?? ""}`.toLowerCase().includes(query);
      })
      .sort((first, second) => getEventSortTime(first) - getEventSortTime(second));
  }, [allEvents, filter, now, requiredOnly, search]);

  const filterOptions = useMemo<SegmentOption<EventFilter>[]>(() => {
    return filters.map((item) => {
      const count = allEvents.filter((event) => {
        const phase = getEventPhase(event, now);
        if (item === "all") return true;
        if (item === "today") return event.schedule ? new Date(event.schedule.starts_at).toDateString() === new Date(now).toDateString() : false;
        if (item === "upcoming") return phase === "upcoming";
        return phase === "completed";
      }).length;
      return { value: item, label: item.charAt(0).toUpperCase() + item.slice(1), count };
    });
  }, [allEvents, now]);

  if (eventsQuery.isLoading && !eventsQuery.data) return <LoadingState label="Loading cached events" />;
  if (eventsQuery.isError) return <View className="flex-1 justify-center bg-slate-50 p-5"><EmptyState title="Events could not be loaded" body="Check your connection and try again." /><View className="mt-4"><Pressable accessibilityRole="button" onPress={() => void eventsQuery.refetch()} className="min-h-12 items-center justify-center rounded-full bg-brand-700"><Text className="font-bold text-white">Try Again</Text></Pressable></View></View>;

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      {/* Top Header Card with Safe Area Insets to avoid phone notification bar */}
      <View
        className="bg-white border-b border-slate-100 shadow-sm"
        style={{ paddingTop: Math.max(insets.top + 10, 20) }}
      >
        <View className="gap-3 px-5 pb-3.5" style={contentStyle}>
          <SectionHeader
            title="Events"
            subtitle={`${allEvents.length} total assigned &bull; ${filterOptions.find((f) => f.value === filter)?.count ?? 0} ${filter}`}
          />

          {/* Live Happening Now Callout Banner */}
          {ongoingEvent ? (
            <Pressable
              onPress={() => router.push(`/event/${ongoingEvent.id}`)}
              className="flex-row items-center justify-between rounded-2xl bg-brand-900 p-3.5 shadow-sm active:opacity-90"
            >
              <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                <View className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <View className="flex-1 min-w-0">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-brand-200">Happening Right Now</Text>
                  <Text className="text-sm font-extrabold text-white" numberOfLines={1}>{ongoingEvent.title}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1.5 ml-2">
                <Text className="text-xs font-bold text-brand-900">Check In</Text>
                <Ionicons name="arrow-forward" size={13} color="#0f766e" />
              </View>
            </Pressable>
          ) : null}

          {/* Search Input with Clear Button */}
          <View className="min-h-12 flex-row items-center rounded-full border border-slate-200/80 bg-slate-50 px-4 shadow-sm">
            <Ionicons name="search-outline" size={19} color="#0f766e" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by title, venue, or description"
              placeholderTextColor="#94a3b8"
              className="min-h-12 flex-1 px-3 text-sm text-slate-950"
            />
            {search.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Clear event search" onPress={() => setSearch("")} className="p-1">
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          {/* Filter Bar */}
          <SegmentedFilter options={filterOptions} value={filter} onChange={setFilter} />
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: requiredOnly }} onPress={() => setRequiredOnly((value) => !value)} className={`min-h-11 flex-row items-center justify-center rounded-full border px-4 ${requiredOnly ? "border-brand-700 bg-brand-50" : "border-slate-200 bg-white"}`}><Ionicons name={requiredOnly ? "checkbox" : "square-outline"} size={18} color="#0f766e" /><Text className="ml-2 text-sm font-semibold text-slate-700">Required events only</Text></Pressable>
        </View>
      </View>

      {/* Events List with safe bottom padding for floating tab bar */}
      <FlashList
        data={events}
        refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} tintColor="#0f766e" />}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(150, insets.bottom + 110)
        }}
        ItemSeparatorComponent={() => <View className="h-3.5" />}
        ListEmptyComponent={
          <EmptyState
            title={search ? "No matching events" : filter === "all" ? "No assigned events" : `No ${filter} events`}
            body={
              search
                ? `No events matched "${search}". Try clearing search or checking other filters.`
                : "Assigned school events for your course and section will appear here."
            }
          />
        }
        renderItem={({ item }) => (
          <View style={contentStyle}>
            <EventCard event={item} onPress={() => router.push(`/event/${item.id}`)} />
          </View>
        )}
      />
    </View>
  );
}
