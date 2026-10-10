"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LogIn,
  LogOut,
  MapPin,
  Megaphone,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { StudentEventCard } from "@/components/student/StudentEventCard";
import { StudentDashboardLoading, StudentError } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAnnouncements, useStudentAttendance, useStudentEvents, useStudentProfile } from "@/components/student/hooks";
import { attendanceNeedsReview, formatDate, formatDateTime, formatTimeRange, getEventPhase, getEventSortTime, isResolvedAttendance } from "@/lib/student/format";

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

  if (loading) return <StudentDashboardLoading />;
  if (hasError) return <div className="px-5 pt-6 lg:px-0"><StudentError message="Your student information could not be loaded. Check your connection and try again." retry={() => void refresh()} /></div>;

  const profile = profileQuery.data;
  const events = eventsQuery.data ?? [];
  const attendance = attendanceQuery.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const activeEvents = events.filter((event) => ["ongoing", "upcoming"].includes(getEventPhase(event))).sort((a, b) => getEventSortTime(a) - getEventSortTime(b));
  const nextEvent = activeEvents[0] ?? null;
  const nextEventAttendance = nextEvent ? attendance.find((row) => row.event_id === nextEvent.id) : null;
  const nextPhase = nextEvent ? getEventPhase(nextEvent) : null;
  const nextAction = !nextEventAttendance?.time_in_server_timestamp && !nextEventAttendance?.time_in_device_timestamp ? "Check in" : !nextEventAttendance?.time_out_server_timestamp && !nextEventAttendance?.time_out_device_timestamp ? "Check out" : "View details";
  const completedRequiredIds = new Set(events.filter((event) => event.requirement === "required" && getEventPhase(event) === "completed").map((event) => event.id));
  const attendedRequiredIds = new Set(attendance.filter((row) => completedRequiredIds.has(row.event_id) && isResolvedAttendance(row.status)).map((row) => row.event_id));
  const attended = attendedRequiredIds.size;
  const missed = Math.max(0, completedRequiredIds.size - attended);
  const reviewCount = attendance.filter((row) => attendanceNeedsReview(row.status)).length;
  const percentage = attended + missed === 0 ? null : Math.round((attended / (attended + missed)) * 100);
  const highlightedAnnouncements = [...announcements].sort((a, b) => {
    const priority = { urgent: 0, important: 1, normal: 2 };
    return priority[a.importance] - priority[b.importance] || new Date(b.publish_at).getTime() - new Date(a.publish_at).getTime();
  }).slice(0, 1);
  const firstName = profile?.full_name?.split(/\s+/)[0] || "Student";

  return (
    <div>
      <section className="border-b border-student-200 bg-student-50 px-5 py-5 text-slate-950 sm:px-6 sm:py-6 lg:rounded-3xl lg:border lg:px-7 lg:py-6">
        <div className="mx-auto max-w-[640px] lg:max-w-none">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-student-700">Welcome back</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{firstName}</h1></div>
            <button type="button" aria-label="Refresh dashboard" onClick={() => void refresh()} disabled={refreshing} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-student-200 bg-white text-student-700 shadow-sm transition hover:bg-student-100 disabled:opacity-60"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full border border-student-200 bg-white px-3 py-1.5">ID: {profile?.student_id ?? "Student"}</span>
            {profile?.year_level ? <span className="rounded-full border border-student-200 bg-white px-3 py-1.5">Year {profile.year_level}</span> : null}
            {profile?.course ? <span className="text-slate-500">{profile.course.code}{profile.section ? ` · ${profile.section.name}` : ""}</span> : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[640px] space-y-5 px-4 pt-4 sm:px-6 lg:grid lg:max-w-none lg:grid-cols-12 lg:items-start lg:gap-5 lg:space-y-0 lg:px-0 lg:pt-5">
        <section aria-labelledby="smart-action-title" className="overflow-hidden rounded-3xl border border-student-200 bg-white p-5 text-slate-900 shadow-[0_6px_24px_rgba(37,99,235,0.06)] sm:p-6 lg:col-span-7">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-student-700">{nextPhase === "ongoing" ? "Ready for attendance" : nextEvent ? "Next event" : "Nothing scheduled yet"}</p><h2 id="smart-action-title" className="mt-2 line-clamp-2 text-2xl font-black tracking-tight">{nextEvent?.title ?? "You are all caught up"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{nextEvent?.schedule ? `${formatDate(nextEvent.schedule.starts_at, { weekday: "long" })} · ${formatTimeRange(nextEvent.schedule.starts_at, nextEvent.schedule.ends_at)}` : "New events will appear here as soon as they are assigned."}</p></div>
            {nextEvent ? <StudentStatusBadge value={nextPhase ?? nextEvent.status} /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-student-50 text-student-600 ring-1 ring-student-200"><CalendarDays size={21} /></span>}
          </div>
          {nextEvent ? <div className="mt-4 grid gap-2 rounded-2xl border border-student-200 bg-student-50 p-3.5 text-xs"><p className="flex items-center gap-2 font-semibold"><MapPin size={15} className="text-student-700" /> {nextEvent.location?.venue_name ?? "Venue pending"}</p><p className="flex items-center gap-2 text-slate-600"><ShieldCheck size={15} className="text-student-700" /> {nextEvent.requirement === "required" ? "Required attendance" : "Optional attendance"}</p></div> : null}
          <div className="mt-5 flex gap-3"><Link href={nextEvent ? `/student/events/${nextEvent.id}` : "/student/events"} className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-student-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-student-700">{nextAction === "Check out" ? <LogOut size={18} /> : nextAction === "Check in" ? <LogIn size={18} /> : <CalendarDays size={18} />}{nextEvent ? nextAction : "Browse events"}</Link>{nextEvent ? <Link href="/student/events" aria-label="View all events" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-student-200 bg-student-50 text-student-700 transition hover:bg-student-100"><CalendarDays size={19} /></Link> : null}</div>
        </section>

        <section aria-labelledby="progress-title" className="rounded-3xl border border-student-200 bg-white p-4 shadow-[0_6px_24px_rgba(37,99,235,0.05)] sm:p-5 lg:col-span-5">
          <div className="flex items-center justify-between gap-3"><h2 id="progress-title" className="text-lg font-black">Attendance progress</h2><span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><CalendarDays size={14} className="text-student-700" /> {new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span></div>
          <div className="mt-4 rounded-2xl border border-student-100 bg-student-50 p-4 text-slate-900">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Current standing</p><p className="mt-1 text-4xl font-black text-slate-950">{percentage == null ? "—" : `${percentage}%`}</p></div>{reviewCount ? <StudentStatusBadge value="requires_review" /> : <span className="inline-flex min-h-6 items-center rounded-full bg-student-100 px-2.5 py-1 text-[11px] font-bold text-student-800 ring-1 ring-inset ring-student-200">Verified</span>}</div>
            <p className={`mt-3 flex items-center gap-2 text-xs font-bold ${percentage != null && percentage < 75 ? "text-amber-800" : "text-student-800"}`}><CheckCircle2 size={14} /> {percentage == null ? "No completed required events yet" : percentage >= 75 ? "Good standing · Above the 75% target" : "Needs attention · Below the 75% target"}</p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-student-100"><div className="h-full rounded-full bg-student-600 transition-all" style={{ width: `${percentage ?? 0}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{attended} attended</span><span>{missed} missed</span></div>
          <Link href="/student/attendance" className="mt-4 flex min-h-11 items-center justify-center gap-2 rounded-full bg-student-100 text-sm font-extrabold text-student-800 transition hover:bg-student-200">View full history <ArrowRight size={16} /></Link>
        </section>

        <section aria-labelledby="quick-actions-title" className="lg:col-span-12"><h2 id="quick-actions-title" className="mb-3 text-lg font-black">Quick actions</h2><div className="grid grid-cols-2 gap-3 lg:max-w-xl"><QuickAction href="/student/attendance" icon={BarChart3} label="Progress" tone="soft" /><QuickAction href="/student/announcements" icon={Megaphone} label="Announcements" /></div></section>

        {nextEvent ? <section aria-labelledby="next-event-title" className="lg:col-span-7"><SectionTitle id="next-event-title" title={nextPhase === "ongoing" ? "Today" : "Next event"} href="/student/events" linkLabel="See all" /><StudentEventCard event={nextEvent} /></section> : null}

        <section aria-labelledby="latest-attendance-title" className={nextEvent ? "lg:col-span-5" : "lg:col-span-12"}>
          <SectionTitle id="latest-attendance-title" title="Latest attendance" href="/student/attendance" linkLabel="See all" />
          {attendance.length ? <div className="space-y-3">{attendance.slice(0, 2).map((row) => <Link key={row.id} href={`/student/attendance/${row.id}`} className="flex items-center gap-3 rounded-2xl border border-student-100 bg-white p-4 shadow-sm transition hover:border-student-200"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-student-50 text-student-700">{row.time_out_server_timestamp || row.time_out_device_timestamp ? <LogOut size={18} /> : <LogIn size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{row.event?.title ?? "Campus event"}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock3 size={12} /> {formatDateTime(row.time_in_server_timestamp ?? row.time_in_device_timestamp)}</p></div><StudentStatusBadge value={row.status} /></Link>)}</div> : <div className="flex min-h-44 flex-col items-center justify-center rounded-3xl border border-dashed border-student-200 bg-white p-6 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-student-50 text-student-600 ring-1 ring-student-200"><CalendarCheck2 size={22} /></span><p className="mt-3 font-bold text-slate-900">No attendance records yet</p><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">Your verified check-ins and check-outs will appear here.</p></div>}
        </section>

        {highlightedAnnouncements.length ? <section aria-labelledby="announcement-title" className="lg:col-span-12"><SectionTitle id="announcement-title" title="Important announcements" href="/student/announcements" linkLabel="View all" />{highlightedAnnouncements.map((announcement) => <article key={announcement.id} className="rounded-2xl border border-student-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{announcement.title}</h3><StudentStatusBadge value={announcement.importance} /></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{announcement.description}</p><p className="mt-3 text-xs font-semibold text-slate-500">{formatDate(announcement.publish_at)}</p></article>)}</section> : null}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, tone = "white" }: { href: string; icon: typeof BarChart3; label: string; tone?: "soft" | "white" }) {
  return <Link href={href} className={`flex min-h-[76px] items-center justify-start gap-3 rounded-2xl border px-4 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:border-student-300 ${tone === "soft" ? "border-student-200 bg-student-100 text-student-900" : "border-student-100 bg-white text-slate-800"}`}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-student-600 shadow-sm"><Icon size={19} /></span>{label}</Link>;
}

function SectionTitle({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><h2 id={id} className="text-lg font-black">{title}</h2><Link href={href} className="flex items-center gap-1 text-sm font-bold text-student-700">{linkLabel} <ArrowRight size={14} /></Link></div>;
}
