import { useState } from "react";
import { router } from "expo-router";
import { Alert, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import type { Event } from "@attendance/types";
import { EventCard } from "../../src/components/EventCard";
import { EmptyState } from "../../src/components/ScreenState";
import { ProgressBar } from "../../src/components/ProgressBar";
import { SectionHeader } from "../../src/components/SectionHeader";
import { StatusBadge } from "../../src/components/StatusBadge";
import { useAnnouncements, useEvents } from "../../src/hooks/useEvents";
import { useNow } from "../../src/hooks/useNow";
import { getAttendanceHistory, getPendingAttendanceRecords } from "../../src/repositories/attendanceRepository";
import { useAuthStore } from "../../src/stores/authStore";
import { formatDate, formatRelativeStatusDate, formatTime, formatTimeRange } from "../../src/utils/format";
import { getEventPhase, getEventSortTime, needsAttention } from "../../src/utils/events";

type HistoryRecord = Awaited<ReturnType<typeof getAttendanceHistory>>[number];

function QuickAction({
  label,
  icon,
  onPress,
  tone = "default"
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: "default" | "primary";
}) {
  const active = tone === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-14 flex-1 flex-row items-center justify-center rounded-full px-3 active:opacity-80 ${
        active ? "bg-brand-700" : "border border-slate-200 bg-white"
      }`}
    >
      <Ionicons name={icon} size={22} color={active ? "#ffffff" : "#0f766e"} />
      <Text className={`ml-2 text-center text-sm font-semibold ${active ? "text-white" : "text-slate-800"}`}>{label}</Text>
    </Pressable>
  );
}

function getWindowUrgency(event: Event | null, canTimeIn: boolean, canTimeOut: boolean) {
  if (!event || !event.schedule) return null;
  const now = Date.now();
  if (canTimeIn) {
    const closes = new Date(event.schedule.check_in_closes_at).getTime();
    const diffMin = Math.round((closes - now) / 60000);
    if (diffMin > 0) {
      return {
        label: diffMin <= 1 ? "Closing in <1m" : `Closes in ${diffMin}m`,
        tone: diffMin <= 10 ? "urgent" : "open"
      };
    }
    if (event.schedule.late_ends_at) {
      const lateCloses = new Date(event.schedule.late_ends_at).getTime();
      const lateDiffMin = Math.round((lateCloses - now) / 60000);
      if (lateDiffMin > 0) {
        return {
          label: `Late grace: ${lateDiffMin}m left`,
          tone: "late"
        };
      }
    }
    return { label: "Window closed", tone: "closed" };
  }

  if (canTimeOut) {
    const closes = new Date(event.schedule.check_out_closes_at ?? event.schedule.ends_at).getTime();
    const diffMin = Math.round((closes - now) / 60000);
    if (diffMin > 0) {
      return {
        label: `Time-out: ${diffMin}m left`,
        tone: diffMin <= 15 ? "urgent" : "open"
      };
    }
  }

  return null;
}

function SmartActionCard({
  event,
  timeInRecord,
  timeOutRecord,
  hasReview,
  onPrimary,
  onSecondary
}: {
  event: Event | null;
  timeInRecord?: HistoryRecord | null;
  timeOutRecord?: HistoryRecord | null;
  hasReview: boolean;
  onPrimary: () => void;
  onSecondary: (() => void) | undefined;
}) {
  const phase = event ? getEventPhase(event) : null;
  const canTimeIn = phase === "ongoing" && !timeInRecord;
  const canTimeOut = phase === "ongoing" && Boolean(timeInRecord) && !timeOutRecord;
  const completed = Boolean(timeOutRecord) || phase === "completed";
  const primaryLabel = !event ? "Browse Events" : canTimeIn ? "Time In Now" : canTimeOut ? "Time Out Now" : completed ? "View Details" : "View Event";
  const primaryIcon: keyof typeof Ionicons.glyphMap = canTimeIn ? "log-in-outline" : canTimeOut ? "log-out-outline" : !event ? "calendar-outline" : "arrow-forward";
  const title = !event ? "Nothing scheduled yet" : canTimeIn ? "Ready for attendance" : canTimeOut ? "Time-in recorded" : completed ? "Attendance status" : "Next event";
  const subtitle = !event
    ? "New events will appear here as soon as they are assigned."
    : canTimeIn
      ? `Check in window: ${event.schedule ? formatTimeRange(event.schedule.check_in_opens_at, event.schedule.check_in_closes_at) : "Pending"}`
      : canTimeOut
        ? `Time out window: ${event.schedule ? formatTimeRange(event.schedule.check_out_opens_at ?? event.schedule.ends_at, event.schedule.check_out_closes_at ?? event.schedule.ends_at) : "Pending"}`
        : event.schedule
          ? formatRelativeStatusDate(event.schedule.starts_at)
          : "Schedule pending";
  const status = hasReview ? "requires_review" : canTimeIn ? "eligible_to_check_in" : canTimeOut ? "time_out_required" : completed ? event?.attendance_status ?? "completed" : event?.status ?? "not_started";
  const urgency = getWindowUrgency(event, canTimeIn, canTimeOut);

  return (
    <View className="overflow-hidden rounded-3xl bg-brand-900 shadow-md">
      <View className="p-5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-xs font-bold uppercase tracking-wider text-brand-200">{title}</Text>
              {urgency ? (
                <View
                  className={`flex-row items-center gap-1 rounded-full px-2.5 py-0.5 border ${
                    urgency.tone === "urgent" || urgency.tone === "closed"
                      ? "bg-rose-500/25 border-rose-400/40"
                      : urgency.tone === "late"
                      ? "bg-amber-500/25 border-amber-400/40"
                      : "bg-emerald-500/25 border-emerald-400/40"
                  }`}
                >
                  <Ionicons
                    name={urgency.tone === "closed" ? "close-circle-outline" : "time-outline"}
                    size={11}
                    color="#ffffff"
                  />
                  <Text className="text-[11px] font-bold text-white tracking-tight">{urgency.label}</Text>
                </View>
              ) : null}
            </View>
            <Text className="mt-2 text-2xl font-extrabold text-white" numberOfLines={2}>
              {event?.title ?? "You are all caught up"}
            </Text>
            <Text className="mt-1.5 text-sm leading-5 text-brand-100">{subtitle}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        {timeInRecord && !timeOutRecord ? (
          <View className="mt-3.5 flex-row items-center gap-2.5 rounded-2xl bg-emerald-950/50 p-3 border border-emerald-400/30">
            <View className="h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20">
              <Ionicons name="checkmark" size={14} color="#34d399" />
            </View>
            <Text className="flex-1 text-xs font-semibold text-emerald-100">
              Time-in recorded at {formatTime(timeInRecord.device_timestamp)} &bull; Ready for check-out
            </Text>
          </View>
        ) : null}

        {event ? (
          <View className="mt-3.5 gap-2 rounded-2xl bg-white/10 p-3.5 border border-white/10">
            <View className="flex-row items-center gap-2">
              <Ionicons name="location-outline" size={15} color="#99f6e4" />
              <Text className="flex-1 text-xs font-semibold text-white" numberOfLines={1}>
                {event.location?.venue_name ?? "Venue pending"}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Ionicons name="shield-checkmark-outline" size={15} color="#99f6e4" />
              <Text className="flex-1 text-xs text-brand-100" numberOfLines={1}>
                {event.requirement === "required" ? "Required attendance" : "Optional attendance"}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mt-5 flex-row gap-3">
          <Pressable
            onPress={onPrimary}
            className="min-h-14 flex-1 flex-row items-center justify-center rounded-full bg-white px-4 shadow-sm active:bg-slate-100"
          >
            <Ionicons name={primaryIcon} size={20} color="#0f766e" />
            <Text className="ml-2 text-sm font-extrabold text-brand-900">{primaryLabel}</Text>
          </Pressable>
          {onSecondary ? (
            <Pressable
              onPress={onSecondary}
              className="h-14 w-14 items-center justify-center rounded-full bg-white/15 active:bg-white/25 border border-white/20"
            >
              <Ionicons name="qr-code-outline" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function StudentHomeScreen() {
  const insets = useSafeAreaInsets();
  const student = useAuthStore((state) => state.student);
  const logout = useAuthStore((state) => state.logout);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const eventsQuery = useEvents();
  const announcementsQuery = useAnnouncements();
  const historyQuery = useQuery({ queryKey: ["attendance-history"], queryFn: getAttendanceHistory });
  const pendingQuery = useQuery({ queryKey: ["pending-attendance"], queryFn: getPendingAttendanceRecords });
  const now = useNow();

  function handleLogout() {
    setProfileMenuOpen(false);
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out of your student account?")) {
        void logout().then(() => router.replace("/(auth)/login"));
      }
      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your student account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          }
        }
      ]
    );
  }

  const events = eventsQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const pendingCount = pendingQuery.data?.length ?? 0;
  const completedRequiredIds = new Set(events.filter((event) => event.requirement === "required" && getEventPhase(event, now) === "completed").map((event) => event.id));
  const attendedRequiredIds = new Set(history.filter((record) => record.mode === "time_in" && completedRequiredIds.has(record.event_id) && ["verified", "completed", "time_in_recorded", "pending_verification", "late", "excused"].includes(record.status)).map((record) => record.event_id));
  const attended = attendedRequiredIds.size;
  const missed = Math.max(0, completedRequiredIds.size - attended);
  const reviewCount = history.filter((record) => needsAttention(record.sync_status) || needsAttention(record.status)).length;
  const percentage = attended + missed === 0 ? null : Math.round((attended / (attended + missed)) * 100);

  const studentInitials = student?.full_name
    ? student.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
    : "ST";

  const upcoming = events
    .filter((event) => getEventPhase(event, now) === "upcoming")
    .sort((first, second) => getEventSortTime(first) - getEventSortTime(second))
    .slice(0, 3);
  const ongoing = events.filter((event) => getEventPhase(event, now) === "ongoing");
  const nextEvent = ongoing[0] ?? upcoming[0] ?? null;
  const nextEventRecords = nextEvent ? history.filter((record) => record.event_id === nextEvent.id) : [];
  const nextTimeIn = nextEventRecords.find((record) => record.mode === "time_in") ?? null;
  const nextTimeOut = nextEventRecords.find((record) => record.mode === "time_out") ?? null;
  const nextEventNeedsReview = nextEventRecords.some((record) => needsAttention(record.sync_status) || needsAttention(record.status));
  const rejectedOrMissed = missed > 0 || history.some((record) => record.status === "rejected" || record.status === "missed");
  const highlightedAnnouncements = [...(announcementsQuery.data ?? [])]
    .sort((first, second) => {
      const priority = { urgent: 0, important: 1, normal: 2 };
      return priority[first.importance] - priority[second.importance] || new Date(second.publish_at).getTime() - new Date(first.publish_at).getTime();
    })
    .slice(0, 1);
  const refreshing = eventsQuery.isRefetching || announcementsQuery.isRefetching || historyQuery.isRefetching || pendingQuery.isRefetching;

  async function refresh() {
    await Promise.all([eventsQuery.refetch(), announcementsQuery.refetch(), historyQuery.refetch(), pendingQuery.refetch()]);
  }

  function openSmartAction() {
    if (!nextEvent) {
      router.push("/(student)/events");
      return;
    }

    const phase = getEventPhase(nextEvent, now);
    if (phase === "ongoing" && !nextTimeIn) {
      router.push(`/check-in/${nextEvent.id}`);
      return;
    }

    if (phase === "ongoing" && nextTimeIn && !nextTimeOut) {
      router.push(`/check-out/${nextEvent.id}`);
      return;
    }

    router.push(`/event/${nextEvent.id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-900" edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerStyle={{ paddingBottom: Math.max(180, insets.bottom + 120) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor="#0f766e" />}
      >
        <View className="rounded-b-3xl bg-brand-900 px-5 pb-24 pt-6">
          <View className="w-full max-w-[620px] self-center">
            {/* Top Bar with Campus Identifier & Header Action Buttons */}
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 border border-white/15">
                <View className="h-2 w-2 rounded-full bg-emerald-400" />
                <Text className="text-[11px] font-bold uppercase tracking-wider text-brand-100">CSU &bull; CBEA Attendance</Text>
              </View>

              <View className="flex-row items-center gap-2.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Scan attendance QR"
                  onPress={() => router.push("/(student)/scan")}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20 border border-white/15"
                >
                  <Ionicons name="qr-code-outline" size={19} color="#ffffff" />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open notifications"
                  onPress={() => router.push("/(student)/notifications")}
                  className="relative h-11 w-11 items-center justify-center rounded-full bg-white/10 active:bg-white/20 border border-white/15"
                >
                  <Ionicons name="notifications-outline" size={19} color="#ffffff" />
                  {reviewCount > 0 ? (
                    <View className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 border-2 border-brand-900" />
                  ) : null}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile menu"
                  onPress={() => setProfileMenuOpen(true)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm active:opacity-90"
                >
                  <Text className="text-xs font-black text-brand-900">{studentInitials}</Text>
                </Pressable>
              </View>
            </View>

            {/* Greeting & Quick Identity Bar */}
            <View className="mt-7">
              <Text className="text-xs font-semibold uppercase tracking-wider text-brand-200">Welcome Back</Text>
              <Text className="mt-1 text-3xl font-extrabold text-white tracking-tight">
                {student?.full_name?.split(" ")[0] ?? "Student"}
              </Text>

              <View className="mt-2.5 flex-row flex-wrap items-center gap-2">
                <View className="rounded-full bg-white/10 px-2.5 py-1 border border-white/10">
                  <Text className="text-xs font-medium text-brand-100">ID: {student?.student_id || "Student"}</Text>
                </View>
                {student?.year_level ? (
                  <View className="rounded-full bg-white/10 px-2.5 py-1 border border-white/10">
                    <Text className="text-xs font-medium text-brand-100">Year {student.year_level}</Text>
                  </View>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={pendingCount > 0 ? `${pendingCount} attendance records waiting to sync. Open attendance history.` : "All attendance records synced. Open attendance history."} onPress={() => router.push("/(student)/attendance")} className={`flex-row items-center gap-1.5 rounded-full px-2.5 py-1 border ${
                  pendingCount > 0
                    ? "bg-amber-500/20 border-amber-400/30"
                    : "bg-emerald-500/20 border-emerald-400/30"
                }`}>
                  <Ionicons
                    name={pendingCount > 0 ? "cloud-upload-outline" : "checkmark-circle-outline"}
                    size={12}
                    color={pendingCount > 0 ? "#fde047" : "#6ee7b7"}
                  />
                  <Text className="text-xs font-semibold text-white">
                    {pendingCount > 0 ? `${pendingCount} offline queued` : "All records synced"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        <View className="-mt-16 w-full max-w-[620px] self-center gap-5 px-5">
          {eventsQuery.isError || historyQuery.isError || pendingQuery.isError ? <View accessibilityRole="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4"><Text className="text-sm font-semibold text-red-800">Some dashboard data could not be refreshed. Cached information may be shown.</Text><Pressable accessibilityRole="button" onPress={() => void refresh()}><Text className="mt-2 font-bold text-red-800">Try again</Text></Pressable></View> : null}
          <SmartActionCard
            event={nextEvent}
            timeInRecord={nextTimeIn}
            timeOutRecord={nextTimeOut}
            hasReview={nextEventNeedsReview}
            onPrimary={openSmartAction}
            onSecondary={nextEvent && getEventPhase(nextEvent, now) === "ongoing" && !nextTimeIn ? () => router.push("/(student)/scan") : undefined}
          />

          <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-slate-950">Attendance Progress</Text>
              <View className="flex-row items-center rounded-full bg-slate-50 px-3 py-2">
                <Ionicons name="calendar" size={14} color="#0f766e" />
                <Text className="ml-2 text-xs font-semibold text-slate-600">
                  {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                </Text>
              </View>
            </View>

            <View className="mt-4 rounded-3xl bg-slate-950 p-4">
              <View className="flex-row items-center justify-between gap-4">
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current standing</Text>
                  <Text className="mt-1 text-4xl font-extrabold text-white">{percentage == null ? "—" : `${percentage}%`}</Text>
                </View>
                {reviewCount > 0 ? <StatusBadge status="requires_review" /> : <StatusBadge status="verified" />}
              </View>

              <View className="mt-2.5 flex-row items-center gap-1.5">
                <Ionicons
                  name={percentage == null ? "information-circle" : percentage >= 90 ? "flame" : percentage >= 75 ? "checkmark-circle" : "alert-circle"}
                  size={14}
                  color={percentage == null ? "#94a3b8" : percentage >= 90 ? "#fbbf24" : percentage >= 75 ? "#34d399" : "#f87171"}
                />
                <Text
                  className={`text-xs font-bold ${
                    percentage == null ? "text-slate-300" : percentage >= 90 ? "text-amber-300" : percentage >= 75 ? "text-emerald-300" : "text-rose-300"
                  }`}
                >
                  {percentage == null
                    ? "No completed required events yet"
                    : percentage >= 90
                    ? "Excellent • On track for clearance"
                    : percentage >= 75
                    ? "Good Standing (Above 75% target)"
                    : "Needs Attention • Below 75% target"}
                </Text>
              </View>
            </View>

            <View className="mt-3">
              <ProgressBar value={percentage ?? 0} trackClassName="bg-brand-50" fillClassName="bg-brand-600" />
            </View>

            <Pressable accessibilityRole="button" onPress={() => router.push("/(student)/attendance/progress")} className="mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-brand-50"><Text className="font-bold text-brand-800">View full progress</Text><Ionicons name="arrow-forward" size={16} color="#0f766e" style={{ marginLeft: 8 }} /></Pressable>
          </View>

          <View className="flex-row gap-3">
            <QuickAction label="Progress" icon="stats-chart-outline" tone="primary" onPress={() => router.push("/(student)/attendance/progress")} />
            <QuickAction
              label={rejectedOrMissed ? "Appeal" : "Announcements"}
              icon={rejectedOrMissed ? "document-text-outline" : "megaphone-outline"}
              onPress={() => router.push(rejectedOrMissed ? "/appeal" : "/(student)/announcements")}
            />
          </View>

          {nextEvent ? (
            <View className="gap-3">
              <SectionHeader title={ongoing.length ? "Today" : "Next Event"} subtitle={formatRelativeStatusDate(nextEvent.schedule?.starts_at)} />
              <EventCard event={nextEvent} onPress={() => router.push(`/event/${nextEvent.id}`)} />
            </View>
          ) : null}

          <View className="gap-3">
            <SectionHeader title="Latest attendance" action={<Pressable accessibilityRole="button" onPress={() => router.push("/(student)/attendance")}><Text className="text-sm font-semibold text-brand-700">See all</Text></Pressable>} />
            {history.slice(0, 2).map((record) => (
              <Pressable key={record.local_id} onPress={() => router.push(`/(student)/attendance/${record.local_id}`)} className="rounded-2xl border border-slate-100 bg-white p-4">
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                      <Ionicons name={record.mode === "time_in" ? "log-in-outline" : "log-out-outline"} size={18} color="#0f766e" />
                    </View>
                    <View>
                      <Text className="font-semibold text-slate-950">{record.mode === "time_in" ? "Time In" : "Time Out"}</Text>
                      <Text className="mt-1 text-xs text-slate-400">{formatDate(record.device_timestamp)}</Text>
                    </View>
                  </View>
                  <StatusBadge status={needsAttention(record.sync_status) ? record.sync_status : record.status || record.sync_status} />
                </View>
              </Pressable>
            ))}
            {!history.length ? <EmptyState title="No recent activity" body="Your check-ins and check-outs will appear here." /> : null}
          </View>

          {highlightedAnnouncements.length ? <View className="gap-3">
            <SectionHeader
              title="Important Announcements"
              action={
                <Pressable onPress={() => router.push("/(student)/announcements")} className="px-2 py-1">
                  <Text className="text-sm font-semibold text-brand-700">View all</Text>
                </Pressable>
              }
            />
            {highlightedAnnouncements.map((announcement) => (
              <View key={announcement.id} className="rounded-2xl border border-slate-100 bg-white p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 font-semibold text-slate-950">{announcement.title}</Text>
                  <StatusBadge status={announcement.importance} />
                </View>
                <Text className="mt-1 text-sm text-slate-600" numberOfLines={2}>
                  {announcement.description}
                </Text>
                <Text className="mt-3 text-xs font-medium text-slate-400">{formatDate(announcement.publish_at)}</Text>
              </View>
            ))}
          </View> : null}
        </View>
      </ScrollView>

      {/* iOS Glassmorphism Profile Dropdown Menu */}
      <Modal
        transparent
        visible={profileMenuOpen}
        animationType="fade"
        onRequestClose={() => setProfileMenuOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/25"
          onPress={() => setProfileMenuOpen(false)}
        >
          <View
            style={{
              position: "absolute",
              top: Math.max(insets.top + 62, 75),
              right: 16,
              width: 232
            }}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View
                className="overflow-hidden rounded-2xl shadow-xl"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.42)",
                  borderColor: "rgba(255, 255, 255, 0.65)",
                  borderWidth: 1.5,
                  shadowColor: "#0f172a",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 16,
                  ...(Platform.OS === "web" ? { backdropFilter: "blur(24px) saturate(180%)" } : {})
                }}
              >
                <BlurView intensity={65} tint="light" style={StyleSheet.absoluteFill} />

                <View className="p-2">
                  {/* Student Quick Header */}
                  <View className="flex-row items-center gap-2 p-1.5 pb-2 border-b border-white/40">
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-900/90 shadow-sm">
                      <Text className="text-xs font-black text-white">{studentInitials}</Text>
                    </View>
                    <View className="flex-1 min-w-0">
                      <Text className="text-xs font-extrabold text-slate-900" numberOfLines={1}>
                        {student?.full_name ?? "Student"}
                      </Text>
                      <Text className="text-[10px] font-semibold text-slate-600" numberOfLines={1}>
                        ID: {student?.student_id ?? "Student"}
                      </Text>
                    </View>
                  </View>

                  {/* Actions List */}
                  <View className="pt-1 gap-0.5">
                    <Pressable
                      onPress={() => {
                        setProfileMenuOpen(false);
                        router.push("/(student)/profile");
                      }}
                      className="flex-row items-center justify-between rounded-xl py-2 px-2.5 active:bg-white/40"
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-white/60 border border-white/70">
                          <Ionicons name="person-outline" size={13} color="#0f766e" />
                        </View>
                        <Text className="text-xs font-bold text-slate-800">Profile</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#64748b" />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setProfileMenuOpen(false);
                        router.push("/appeal");
                      }}
                      className="flex-row items-center justify-between rounded-xl py-2 px-2.5 active:bg-white/40"
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-white/60 border border-white/70">
                          <Ionicons name="document-text-outline" size={13} color="#0f766e" />
                        </View>
                        <Text className="text-xs font-bold text-slate-800">Appeals</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#64748b" />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setProfileMenuOpen(false);
                        router.push("/(student)/attendance/progress");
                      }}
                      className="flex-row items-center justify-between rounded-xl py-2 px-2.5 active:bg-white/40"
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-white/60 border border-white/70">
                          <Ionicons name="stats-chart-outline" size={13} color="#0f766e" />
                        </View>
                        <Text className="text-xs font-bold text-slate-800">Standing</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#64748b" />
                    </Pressable>

                    {/* Hairline Glass Divider */}
                    <View className="my-1 h-[1px] bg-white/40" />

                    {/* Logout Action */}
                    <Pressable
                      onPress={handleLogout}
                      className="flex-row items-center justify-between rounded-xl py-2 px-2.5 bg-rose-500/15 active:bg-rose-500/25 border border-rose-300/40"
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-6 w-6 items-center justify-center rounded-full bg-rose-200/60">
                          <Ionicons name="log-out-outline" size={13} color="#e11d48" />
                        </View>
                        <Text className="text-xs font-extrabold text-rose-700">Log Out</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={13} color="#e11d48" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
