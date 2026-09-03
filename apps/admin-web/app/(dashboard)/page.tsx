"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, ClipboardCheck, Clock3, RefreshCw, UserRoundCheck, Users } from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/queries";

function Metric({ label, value, helper, icon: Icon, tone = "neutral" }: { label: string; value: number | string; helper: string; icon: typeof Users; tone?: "neutral" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "bg-emerald-50 text-emerald-700" : tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700";
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon size={20} /></span>
      </CardContent>
    </Card>
  );
}

export default function DashboardOverviewPage() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 30_000 });
  const stats = query.data;

  if (query.isError) {
    return <Card><CardContent className="flex flex-col items-start gap-3"><p className="font-bold text-slate-950">Dashboard data could not be loaded.</p><p className="text-sm text-slate-500">Check the connection and try again.</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw size={16} />Try again</Button></CardContent></Card>;
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-brand-700">Operations center</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Today at a glance</h1>
          <p className="mt-1 text-sm text-slate-500">Live attendance signals and work that needs an administrator.</p>
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}><RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} />Refresh</Button>
      </div>

      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="attention-heading" className="text-lg font-black text-slate-950">Needs attention</h2>
          <Link href="/attendance/review" className="flex items-center gap-1 text-sm font-bold text-brand-700 hover:text-brand-900">Open review queue <ArrowRight size={15} /></Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="Pending reviews" value={stats?.pendingReviews ?? 0} helper="Flagged attendance records" icon={AlertTriangle} tone={(stats?.pendingReviews ?? 0) > 0 ? "warn" : "good"} />
          <Metric label="Ongoing events" value={stats?.ongoingEvents ?? 0} helper="Events active right now" icon={CalendarClock} />
          <Metric label="Absence requests" value={stats?.pendingAbsenceRequests ?? 0} helper="Waiting for a decision" icon={ClipboardCheck} tone={(stats?.pendingAbsenceRequests ?? 0) > 0 ? "warn" : "neutral"} />
        </div>
      </section>

      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-lg font-black text-slate-950">Today</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Attendance activity" value={stats?.attendanceToday ?? 0} helper="Records created today" icon={Users} />
          <Metric label="Verified or resolved" value={stats?.present ?? 0} helper="Accepted attendance records" icon={UserRoundCheck} tone="good" />
          <Metric label="Late" value={stats?.late ?? 0} helper="Marked late today" icon={Clock3} tone={(stats?.late ?? 0) > 0 ? "warn" : "neutral"} />
          <Metric label="Resolution rate" value={`${stats?.attendanceRate ?? 0}%`} helper="Today’s processed records" icon={CheckCircle2} tone="good" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div><h2 className="text-lg font-black text-slate-950">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest attendance updates from today.</p></div>
            <Link href="/attendance/live" className="text-sm font-bold text-brand-700">View live</Link>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.recentActivity ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0">
                <div className="min-w-0"><p className="truncate font-bold text-slate-950">{row.student?.[0]?.full_name ?? "Student"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row.event?.[0]?.title ?? "Event"} · {new Date(row.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div>
                <Badge tone={row.sync_status === "requires_review" ? "requires_review" : row.status}>{labelize(row.sync_status === "requires_review" ? row.sync_status : row.status)}</Badge>
              </div>
            ))}
            {!query.isLoading && !stats?.recentActivity.length ? <div className="p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-600" /><p className="mt-3 font-bold text-slate-950">No activity yet today</p><p className="mt-1 text-sm text-slate-500">New Time In and Time Out records will appear here.</p></div> : null}
            {query.isLoading ? <div className="space-y-3 p-5" aria-label="Loading activity">{[1,2,3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-lg font-black text-slate-950">Workspace</h2><p className="mt-1 text-sm text-slate-500">Useful totals and next actions.</p></CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Active student profiles</p><p className="mt-1 text-2xl font-black">{stats?.totalStudents ?? 0}</p></div>
            <div className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">Published and upcoming events</p><p className="mt-1 text-2xl font-black">{stats?.upcomingEvents ?? 0}</p></div>
            <Button asChild className="w-full"><Link href="/events/new">Create an event <ArrowRight size={16} /></Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
