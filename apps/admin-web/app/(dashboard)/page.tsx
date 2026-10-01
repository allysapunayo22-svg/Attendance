"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BarChart3, CalendarDays, Check, ClipboardCheck, Clock3, Plus, RefreshCw, Users, X } from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/queries";

export default function DashboardOverviewPage() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 25_000 });
  const stats = query.data;
  const total = stats?.attendanceToday ?? 0;
  const percentage = (value: number) => total ? Math.round((value / total) * 100) : 0;
  const lastUpdated = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
  const todayLabel = new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto w-full max-w-[1480px] space-y-5">
      {query.isError ? <div role="alert" className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Dashboard data could not be loaded.</span><button className="font-semibold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Overview</h1>
          <p className="mt-1 text-base text-slate-500">Today’s attendance at a glance</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500"><span>Last updated today at {lastUpdated}</span><span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Live</span></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden items-center gap-2 text-xs text-slate-600 lg:flex"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><CalendarDays size={16} /></span><span>{todayLabel}</span></div>
          <Button asChild className="h-11 px-5"><Link href="/events/new"><Plus size={16} /> New Event</Link></Button>
          <Button variant="outline" className="h-11 px-4" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={15} className={query.isFetching ? "animate-spin" : ""} /> Refresh</Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Check-ins today" value={stats?.attendanceToday} helper={total ? `${total} attendance record${total === 1 ? "" : "s"}` : "No activity yet"} icon={Users} href="/attendance/live" tone="blue" />
        <SummaryCard label="Verified" value={stats?.present} helper={`${percentage(stats?.present ?? 0)}% of today’s check-ins`} icon={Check} href="/attendance/live" tone="green" />
        <SummaryCard label="Needs review" value={stats?.pendingReviews} helper="Pending verification" icon={AlertTriangle} href="/attendance/review" tone="amber" />
        <SummaryCard label="Events happening now" value={stats?.ongoingEvents} helper={(stats?.ongoingEvents ?? 0) ? "Currently active" : "No active events"} icon={CalendarDays} href="/events" tone="violet" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden rounded-2xl border-slate-200/90 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between bg-white px-5 py-4">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Clock3 size={17} /></span><div><h2 className="font-bold text-slate-950">Recent check-ins</h2><p className="text-xs text-slate-500">The latest attendance activity from today.</p></div></div>
            <Link href="/attendance/live" className="flex items-center gap-1 text-xs font-semibold text-brand-700">View all <ArrowRight size={13} /></Link>
          </CardHeader>
          <CardContent className="min-h-[300px] p-0">
            {(stats?.recentActivity ?? []).map((row) => {
              const flagged = row.status === "pending_verification" || row.sync_status === "requires_review";
              return <div key={row.id} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.student?.[0]?.full_name ?? "Student"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row.event?.[0]?.title ?? "Event"} · {new Date(row.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div><Badge tone={flagged ? "requires_review" : row.status}>{labelize(flagged ? "requires_review" : row.status)}</Badge></div>;
            })}
            {!query.isLoading && !stats?.recentActivity?.length ? <EmptyState icon={ClipboardCheck} title="No check-ins yet today" description="New attendance records will appear here once students start checking in." actionHref="/events" actionLabel="View Events" /> : null}
            {query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200/90 shadow-xs">
          <CardHeader className="flex flex-row items-center gap-3 px-5 py-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><BarChart3 size={17} /></span><h2 className="font-bold text-slate-950">Today’s outcome</h2></CardHeader>
          <CardContent className="space-y-3 p-4">
            <OutcomeRow label="Resolved records" value={stats?.present ?? 0} percent={stats?.resolutionRate ?? 0} icon={Check} tone="green" />
            <OutcomeRow label="Late check-ins" value={stats?.late ?? 0} percent={percentage(stats?.late ?? 0)} icon={Clock3} tone="amber" />
            <OutcomeRow label="Missed" value={stats?.absent ?? 0} percent={percentage(stats?.absent ?? 0)} icon={X} tone="red" />
            <OutcomeRow label="Upcoming events" value={stats?.upcomingEvents ?? 0} icon={CalendarDays} tone="blue" href="/events" />
            <p className="border-t border-slate-100 px-1 pt-4 text-xs leading-5 text-slate-500">Resolved records include verified, completed, late, and excused submissions.</p>
          </CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-2xl border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between bg-white px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><CalendarDays size={17} /></span><div><h2 className="font-bold text-slate-950">Today’s events</h2><p className="text-xs text-slate-500">Events scheduled for today.</p></div></div><Link href="/events" className="flex items-center gap-1 text-xs font-semibold text-brand-700">View all <ArrowRight size={13} /></Link></CardHeader>
        <CardContent className="p-0">
          {(stats?.todayEvents ?? []).map((schedule) => {
            const event = Array.isArray(schedule.event) ? schedule.event[0] : schedule.event;
            return <div key={schedule.id} className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{event?.title ?? "Campus event"}</p><p className="mt-1 text-xs text-slate-500">{schedule.starts_at?.slice(0, 5) ?? "—"} – {schedule.ends_at?.slice(0, 5) ?? "—"}</p></div><Badge tone={event?.status ?? "published"}>{labelize(event?.status ?? "published")}</Badge></div>;
          })}
          {!query.isLoading && !stats?.todayEvents?.length ? <EmptyState icon={CalendarDays} title="No events scheduled today" description="Create a new event to start collecting attendance." actionHref="/events/new" actionLabel="Create Event" compact /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

const tones = {
  blue: { icon: "bg-blue-50 text-blue-600", glow: "from-blue-50/80", dot: "bg-blue-500" },
  green: { icon: "bg-emerald-50 text-emerald-600", glow: "from-emerald-50/80", dot: "bg-emerald-500" },
  amber: { icon: "bg-amber-50 text-amber-600", glow: "from-amber-50/80", dot: "bg-amber-500" },
  violet: { icon: "bg-violet-50 text-violet-600", glow: "from-violet-50/80", dot: "bg-violet-500" },
  red: { icon: "bg-rose-50 text-rose-600", glow: "from-rose-50/80", dot: "bg-rose-500" }
};

function SummaryCard({ label, value, helper, icon: Icon, href, tone }: { label: string; value: number | undefined; helper: string; icon: typeof Users; href: string; tone: "blue" | "green" | "amber" | "violet" }) {
  const colors = tones[tone];
  return <Link href={href} className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:shadow-md"><div className={`absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t ${colors.glow} to-transparent`} /><div className="relative flex items-start gap-4"><span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${colors.icon}`}><Icon size={23} /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{value ?? "—"}</p></div></div><div className="relative mt-4 flex items-center justify-between"><span className="flex min-w-0 items-center gap-2 truncate text-xs text-slate-500"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${colors.dot}`} />{helper}</span><span className={`ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colors.icon}`}><ArrowRight size={14} /></span></div></Link>;
}

function OutcomeRow({ label, value, percent, icon: Icon, tone, href }: { label: string; value: number; percent?: number; icon: typeof Check; tone: keyof typeof tones; href?: string }) {
  const content = <><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone].icon}`}><Icon size={17} /></span><span className="flex-1 text-sm text-slate-600">{label}</span><span className="font-bold text-slate-950">{value}</span>{percent != null ? <span className="w-10 text-right text-xs text-slate-500">{percent}%</span> : <ArrowRight size={15} className="text-slate-400" />}</>;
  const className = "flex items-center gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5";
  return href ? <Link href={href} className={`${className} hover:bg-slate-100`}>{content}</Link> : <div className={className}>{content}</div>;
}

function EmptyState({ icon: Icon, title, description, actionHref, actionLabel, compact = false }: { icon: typeof ClipboardCheck; title: string; description: string; actionHref: string; actionLabel: string; compact?: boolean }) {
  return <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "min-h-44 py-8" : "min-h-[300px] py-10"}`}><span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon size={34} /></span><p className="mt-4 font-bold text-slate-950">{title}</p><p className="mt-1 max-w-sm text-sm leading-5 text-slate-500">{description}</p><Button asChild variant="outline" className="mt-4 h-10"><Link href={actionHref}><Plus size={14} /> {actionLabel}</Link></Button></div>;
}
