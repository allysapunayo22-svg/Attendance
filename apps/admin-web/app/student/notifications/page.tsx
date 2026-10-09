"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Search } from "lucide-react";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { StudentRefreshButton } from "@/components/student/StudentRefreshButton";
import { StudentEmpty, StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentNotifications } from "@/components/student/hooks";
import { markStudentNotificationRead, markStudentNotificationsRead } from "@/lib/student/data";
import { formatDateTime, notificationDestination } from "@/lib/student/format";
import { studentQueryKeys } from "@/lib/student/query-keys";
import type { StudentNotification } from "@/lib/student/types";

const filters = ["all", "unread", "events", "attendance", "appeals"] as const;
type NotificationFilter = (typeof filters)[number];

function matchesFilter(row: StudentNotification, filter: NotificationFilter) {
  if (filter === "all") return true;
  if (filter === "unread") return !row.read_at;
  if (filter === "events") return ["event_reminder", "schedule_change", "event_cancelled", "check_in_open", "check_out_reminder"].includes(row.type);
  if (filter === "attendance") return ["attendance_verified", "attendance_rejected"].includes(row.type);
  return row.type === "appeal_decision";
}

export default function StudentNotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useStudentNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const unread = rows.filter((row) => !row.read_at);
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return rows.filter((row) => matchesFilter(row, filter) && (!value || `${row.title} ${row.body}`.toLowerCase().includes(value)));
  }, [filter, rows, search]);

  if (query.isLoading) return <StudentLoading label="Loading notifications" />;
  if (query.isError) return <StudentError message="Your notification inbox could not be loaded." retry={() => void query.refetch()} />;

  function updateReadState(ids: string[], readAt: string) {
    queryClient.setQueryData<StudentNotification[]>(studentQueryKeys.notifications, (current) => current?.map((row) => ids.includes(row.id) ? { ...row, read_at: row.read_at ?? readAt } : row));
  }

  async function openNotification(row: StudentNotification) {
    setActionError(null);
    try {
      if (!row.read_at) {
        const readAt = await markStudentNotificationRead(row.id);
        updateReadState([row.id], readAt);
      }
      const destination = notificationDestination(row.metadata);
      if (destination) router.push(destination);
    } catch {
      setActionError("The notification could not be updated. Please try again.");
    }
  }

  async function markAllRead() {
    setActionError(null);
    try {
      const ids = unread.map((row) => row.id);
      const readAt = await markStudentNotificationsRead(ids);
      updateReadState(ids, readAt);
    } catch {
      setActionError("Notifications could not be marked as read.");
    }
  }

  return (
    <div className="space-y-5">
      <StudentPageHeader title="Notifications" description={`${unread.length} unread · ${rows.length} recent`} action={<StudentRefreshButton refreshing={query.isFetching} onRefresh={() => void query.refetch()} />} />
      {unread.length ? <button type="button" onClick={() => void markAllRead()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-teal-100 px-4 text-sm font-bold text-teal-900 hover:bg-teal-200"><CheckCheck size={17} /> Mark all as read</button> : null}
      {actionError ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</p> : null}
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search notifications</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notifications" className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" /></label><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold capitalize ${filter === item ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}</div></div>
      {filtered.length ? <div className="space-y-3">{filtered.map((row) => { const destination = notificationDestination(row.metadata); return <button key={row.id} type="button" onClick={() => void openNotification(row)} className={`w-full rounded-3xl border bg-white p-5 text-left shadow-sm transition hover:border-teal-200 ${row.read_at ? "border-slate-200/80" : "border-teal-300 ring-2 ring-teal-100"}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-extrabold text-slate-950">{row.title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{row.body}</p></div><StudentStatusBadge value={row.read_at ? "read" : "unread"} /></div><div className="mt-3 flex items-center justify-between gap-3"><time className="text-xs text-slate-400">{formatDateTime(row.created_at)}</time>{destination ? <span className="text-xs font-bold text-teal-700">Open details</span> : null}</div></button>; })}</div> : <StudentEmpty icon={Bell} title="No notifications" description={search || filter !== "all" ? "Try another search or inbox filter." : "Event reminders and attendance decisions will appear here."} />}
    </div>
  );
}
