"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
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
    <div className="">
      <section className="rounded-b-[2rem] bg-student-100 px-5 pb-24 pt-4 text-slate-800 lg:rounded-[2rem] lg:px-8 lg:pb-24 lg:pt-7">
        <div className="mx-auto max-w-[620px] lg:max-w-none">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-student-700">Welcome back</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{firstName}</h1></div>
            <button type="button" aria-label="Refresh dashboard" onClick={() => void refresh()} disabled={refreshing} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-student-200 bg-white transition hover:bg-student-100 disabled:opacity-60"><RefreshCw size={18} className={refreshing ? "animate-spin" : ""} /></button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
            <span className="rounded-full border border-student-200 bg-student-50 px-3 py-1.5">ID: {profile?.student_id ?? "Student"}</span>
            {profile?.year_level ? <span className="rounded-full border border-student-200 bg-student-50 px-3 py-1.5">Year {profile.year_level}</span> : null}
          </div>
          {profile?.course ? <p className="mt-3 text-sm text-slate-600">{profile.course.code}{profile.section ? ` · ${profile.section.name}` : ""}</p> : null}
        </div>
      </section>

      <div className="mx-auto -mt-16 max-w-[620px] space-y-5 px-5 lg:max-w-none lg:px-6">
        <section aria-labelledby="smart-action-title" className="overflow-hidden rounded-[2rem] bg-white border border-student-200 p-5 text-slate-800 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-student-700">{nextPhase === "ongoing" ? "Ready for attendance" : nextEvent ? "Next event" : "Nothing scheduled yet"}</p><h2 id="smart-action-title" className="mt-2 line-clamp-2 text-2xl font-black tracking-tight">{nextEvent?.title ?? "You are all caught up"}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{nextEvent?.schedule ? `${formatDate(nextEvent.schedule.starts_at, { weekday: "long" })} · ${formatTimeRange(nextEvent.schedule.starts_at, nextEvent.schedule.ends_at)}` : "New events will appear here as soon as they are assigned."}</p></div>
            {nextEvent ? <StudentStatusBadge value={nextPhase ?? nextEvent.status} /> : <CheckCircle2 className="shrink-0 text-emerald-700" size={24} />}
          </div>
          {nextEvent ? <div className="mt-4 grid gap-2 rounded-2xl border border-student-200 bg-student-50 p-3.5 text-xs"><p className="flex items-center gap-2 font-semibold"><MapPin size={15} className="text-student-700" /> {nextEvent.location?.venue_name ?? "Venue pending"}</p><p className="flex items-center gap-2 text-slate-600"><ShieldCheck size={15} className="text-student-700" /> {nextEvent.requirement === "required" ? "Required attendance" : "Optional attendance"}</p></div> : null}
          <div className="mt-5 flex gap-3"><Link href={nextEvent ? `/student/events/${nextEvent.id}` : "/student/events"} className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full bg-student-100 px-5 text-sm font-extrabold text-student-800 shadow-sm">{nextAction === "Check out" ? <LogOut size={19} /> : nextAction === "Check in" ? <LogIn size={19} /> : <CalendarDays size={19} />}{nextEvent ? nextAction : "Browse events"}</Link>{nextEvent ? <Link href="/student/events" aria-label="View all events" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-student-200 bg-white hover:bg-student-100"><CalendarDays size={21} /></Link> : null}</div>
        </section>

        <section aria-labelledby="progress-title" className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3"><h2 id="progress-title" className="text-lg font-black">Attendance progress</h2><span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><CalendarDays size={14} className="text-student-700" /> {new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span></div>
          <div className="mt-4 rounded-3xl bg-student-50 p-4 text-slate-800">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Current standing</p><p className="mt-1 text-4xl font-black">{percentage == null ? "—" : `${percentage}%`}</p></div><StudentStatusBadge value={reviewCount ? "requires_review" : "verified"} /></div>
            <p className={`mt-3 flex items-center gap-2 text-xs font-bold ${percentage == null ? "text-slate-600" : percentage >= 75 ? "text-emerald-700" : "text-amber-800"}`}><CheckCircle2 size={14} /> {percentage == null ? "No completed required events yet" : percentage >= 75 ? "Good standing · Above the 75% target" : "Needs attention · Below the 75% target"}</p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-student-50"><div className="h-full rounded-full bg-student-700 transition-all" style={{ width: `${percentage ?? 0}%` }} /></div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500"><span>{attended} attended</span><span>{missed} missed</span></div>
          <Link href="/student/attendance" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-full bg-student-50 text-sm font-extrabold text-student-700">View full history <ArrowRight size={16} /></Link>
        </section>

        <section aria-labelledby="quick-actions-title"><h2 id="quick-actions-title" className="mb-3 text-lg font-black">Quick actions</h2><div className="grid grid-cols-2 gap-3"><QuickAction href="/student/attendance" icon={BarChart3} label="Progress" primary /><QuickAction href="/student/announcements" icon={Megaphone} label="Announcements" /></div></section>

        {nextEvent ? <section aria-labelledby="next-event-title"><SectionTitle id="next-event-title" title={nextPhase === "ongoing" ? "Today" : "Next event"} href="/student/events" linkLabel="See all" /><StudentEventCard event={nextEvent} /></section> : null}

        <section aria-labelledby="latest-attendance-title">
          <SectionTitle id="latest-attendance-title" title="Latest attendance" href="/student/attendance" linkLabel="See all" />
          {attendance.length ? <div className="space-y-3">{attendance.slice(0, 2).map((row) => <Link key={row.id} href={`/student/attendance/${row.id}`} className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-student-50 text-student-700">{row.time_out_server_timestamp || row.time_out_device_timestamp ? <LogOut size={18} /> : <LogIn size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate font-bold">{row.event?.title ?? "Campus event"}</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><Clock3 size={12} /> {formatDateTime(row.time_in_server_timestamp ?? row.time_in_device_timestamp)}</p></div><StudentStatusBadge value={row.status} /></Link>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm text-slate-500">Your check-ins and check-outs will appear here.</div>}
        </section>

        {highlightedAnnouncements.length ? <section aria-labelledby="announcement-title"><SectionTitle id="announcement-title" title="Important announcements" href="/student/announcements" linkLabel="View all" />{highlightedAnnouncements.map((announcement) => <article key={announcement.id} className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{announcement.title}</h3><StudentStatusBadge value={announcement.importance} /></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{announcement.description}</p><p className="mt-3 text-xs font-semibold text-slate-400">{formatDate(announcement.publish_at)}</p></article>)}</section> : null}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, primary = false }: { href: string; icon: typeof BarChart3; label: string; primary?: boolean }) {
  return <Link href={href} className={`flex min-h-14 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold shadow-sm ${primary ? "border-student-700 bg-student-700 text-white" : "border-slate-200 bg-white text-slate-800"}`}><Icon size={20} /> {label}</Link>;
}

function SectionTitle({ id, title, href, linkLabel }: { id: string; title: string; href: string; linkLabel: string }) {
  return <div className="mb-3 flex items-center justify-between gap-3"><h2 id={id} className="text-lg font-black">{title}</h2><Link href={href} className="flex items-center gap-1 text-sm font-bold text-student-700">{linkLabel} <ArrowRight size={14} /></Link></div>;
}
