"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, CalendarDays, CheckCircle2, ClipboardCheck, Megaphone } from "lucide-react";
import { StudentEventCard } from "@/components/student/StudentEventCard";
import { StudentRefreshButton } from "@/components/student/StudentRefreshButton";
import { StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAnnouncements, useStudentAttendance, useStudentEvents, useStudentProfile } from "@/components/student/hooks";
import { attendanceNeedsReview, formatDateTime, getEventPhase, getEventSortTime, isResolvedAttendance } from "@/lib/student/format";

export default function StudentHomePage() {
  const profileQuery = useStudentProfile();
  const eventsQuery = useStudentEvents();
  const attendanceQuery = useStudentAttendance();
  const announcementsQuery = useStudentAnnouncements();
  const loading = profileQuery.isLoading || eventsQuery.isLoading || attendanceQuery.isLoading || announcementsQuery.isLoading;
  const hasError = profileQuery.isError || eventsQuery.isError || attendanceQuery.isError || announcementsQuery.isError;
  const refreshing = profileQuery.isFetching || eventsQuery.isFetching || attendanceQuery.isFetching || announcementsQuery.isFetching;

  async function refresh() {
    await Promise.all([profileQuery.refetch(), eventsQuery.refetch(), attendanceQuery.refetch(), announcementsQuery.refetch()]);
  }

  if (loading) return <StudentLoading label="Loading your student dashboard" />;
  if (hasError) return <StudentError message="Your student information could not be loaded. Check your connection and try again." retry={() => void refresh()} />;

  const profile = profileQuery.data;
  const events = eventsQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const activeEvents = events.filter((event) => ["ongoing", "upcoming"].includes(getEventPhase(event))).sort((a, b) => getEventSortTime(a) - getEventSortTime(b));
  const nextEvent = activeEvents[0] ?? null;
  const resolved = attendance.filter((row) => isResolvedAttendance(row.status)).length;
  const needsReview = attendance.filter((row) => attendanceNeedsReview(row.status)).length;
  const highlightedAnnouncements = [...announcements].sort((a, b) => {
    const priority = { urgent: 0, important: 1, normal: 2 };
    return priority[a.importance] - priority[b.importance] || new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
  }).slice(0, 2);
  const firstName = profile?.full_name?.split(/\s+/)[0] || "Student";

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-teal-700">Welcome back</p><h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Hello, {firstName}</h1><p className="mt-1 text-sm text-slate-500">{profile?.course ? `${profile.course.code}${profile.section ? ` · ${profile.section.name}` : ""}` : "Your student activity at a glance"}</p></div><StudentRefreshButton refreshing={refreshing} onRefresh={() => void refresh()} /></header>

      {nextEvent ? <section aria-labelledby="next-event-title"><div className="mb-3 flex items-center justify-between"><h2 id="next-event-title" className="text-base font-extrabold text-slate-950">Next on your schedule</h2><Link href="/student/events" className="flex items-center gap-1 text-sm font-bold text-teal-700">All events <ArrowRight size={14} /></Link></div><StudentEventCard event={nextEvent} /></section> : <section className="rounded-3xl bg-gradient-to-br from-teal-950 to-teal-800 p-6 text-white shadow-lg"><CalendarDays size={26} /><h2 className="mt-4 text-xl font-black">You’re all caught up</h2><p className="mt-2 text-sm leading-6 text-teal-100">New assigned and unrestricted student events will appear here automatically.</p><Link href="/student/events" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-teal-950">Browse events</Link></section>}

      <section aria-labelledby="attendance-summary-title"><div className="mb-3 flex items-center justify-between"><h2 id="attendance-summary-title" className="text-base font-extrabold text-slate-950">Attendance summary</h2><Link href="/student/attendance" className="text-sm font-bold text-teal-700">View history</Link></div><div className="grid grid-cols-3 gap-3"><SummaryMetric icon={ClipboardCheck} label="Records" value={attendance.length} tone="teal" /><SummaryMetric icon={CheckCircle2} label="Resolved" value={resolved} tone="green" /><SummaryMetric icon={AlertTriangle} label="Review" value={needsReview} tone="amber" /></div></section>

      <section aria-labelledby="quick-actions-title"><h2 id="quick-actions-title" className="mb-3 text-base font-extrabold text-slate-950">Quick actions</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><QuickAction href="/student/events" icon={CalendarDays} label="Events" /><QuickAction href="/student/attendance" icon={ClipboardCheck} label="Attendance" /><QuickAction href="/student/announcements" icon={Megaphone} label="Notices" /><QuickAction href="/student/notifications" icon={Bell} label="Inbox" /></div></section>

      <section aria-labelledby="announcements-title"><div className="mb-3 flex items-center justify-between"><h2 id="announcements-title" className="text-base font-extrabold text-slate-950">Latest notices</h2><Link href="/student/announcements" className="flex items-center gap-1 text-sm font-bold text-teal-700">View all <ArrowRight size={14} /></Link></div>{highlightedAnnouncements.length ? <div className="grid gap-3 md:grid-cols-2">{highlightedAnnouncements.map((announcement) => <article key={announcement.id} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><StudentStatusBadge value={announcement.importance} /><time className="text-xs text-slate-400">{formatDateTime(announcement.publish_at)}</time></div><h3 className="mt-3 font-extrabold text-slate-950">{announcement.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{announcement.description}</p></article>)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">No published announcements are available.</div>}</section>
    </div>
  );
}

function SummaryMetric({ icon: Icon, label, value, tone }: { icon: typeof ClipboardCheck; label: string; value: number; tone: "teal" | "green" | "amber" }) {
  const classes = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-teal-50 text-teal-700";
  return <div className="rounded-3xl border border-slate-200/70 bg-white p-3 shadow-sm sm:p-4"><span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${classes}`}><Icon size={17} /></span><p className="mt-3 text-2xl font-black text-slate-950">{value}</p><p className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</p></div>;
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: typeof CalendarDays; label: string }) {
  return <Link href={href} className="flex min-h-24 flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-3 text-center shadow-sm hover:border-teal-200 hover:bg-teal-50/40"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-700"><Icon size={19} /></span><span className="mt-2 text-xs font-bold text-slate-800">{label}</span></Link>;
}
