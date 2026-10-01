"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, RefreshCw, Users } from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/queries";

export default function DashboardOverviewPage() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 25_000 });
  const stats = query.data;
  const lastUpdated = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      {query.isError ? <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Dashboard data could not be loaded.</span><button className="font-semibold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Overview</h1>
          <p className="mt-1 text-sm font-medium text-slate-700">Today’s attendance at a glance</p>
          <p className="mt-1 text-xs text-slate-500">Last updated {lastUpdated}</p>
        </div>
        <Button variant="outline" className="h-9 text-xs" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Check-ins today" value={stats?.attendanceToday} icon={Users} href="/attendance/live" />
        <SummaryCard label="Verified" value={stats?.present} icon={CheckCircle2} href="/attendance/live" />
        <SummaryCard label="Needs review" value={stats?.pendingReviews} icon={AlertTriangle} href="/attendance/review" warning={(stats?.pendingReviews ?? 0) > 0} />
        <SummaryCard label="Events happening now" value={stats?.ongoingEvents} icon={CalendarDays} href="/events" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.5fr]">
        <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5">
            <div><h2 className="font-bold text-slate-900">Recent check-ins</h2><p className="mt-1 text-xs text-slate-500">The latest attendance activity from today.</p></div>
            <Link href="/attendance/live" className="flex items-center gap-1 text-xs font-semibold text-brand-700">View all <ArrowRight size={13} /></Link>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.recentActivity ?? []).map((row) => {
              const flagged = row.status === "pending_verification" || row.sync_status === "requires_review";
              return <div key={row.id} className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.student?.[0]?.full_name ?? "Student"}</p><p className="mt-0.5 truncate text-xs text-slate-500">{row.event?.[0]?.title ?? "Event"} · {new Date(row.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p></div><Badge tone={flagged ? "requires_review" : row.status}>{labelize(flagged ? "requires_review" : row.status)}</Badge></div>;
            })}
            {!query.isLoading && !stats?.recentActivity?.length ? <div className="p-12 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={28} /><p className="mt-3 text-sm font-semibold text-slate-900">No check-ins yet today</p><p className="mt-1 text-xs text-slate-500">New attendance records will appear here.</p></div> : null}
            {query.isLoading ? <div className="space-y-3 p-5">{[1, 2, 3].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />)}</div> : null}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs"><CardContent className="p-5"><h2 className="font-bold text-slate-900">Today’s outcome</h2><div className="mt-4 space-y-3 text-sm"><StatRow label="Resolved records" value={`${stats?.resolutionRate ?? 0}%`} /><StatRow label="Late check-ins" value={stats?.late ?? 0} /><StatRow label="Missed" value={stats?.absent ?? 0} /><StatRow label="Upcoming events" value={stats?.upcomingEvents ?? 0} /></div><p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Resolved records include verified, completed, late, and excused submissions.</p></CardContent></Card>
          {(stats?.pendingReviews ?? 0) > 0 ? <Button asChild className="w-full"><Link href="/attendance/review"><AlertTriangle size={15} /> Review {stats?.pendingReviews} record{stats?.pendingReviews === 1 ? "" : "s"}</Link></Button> : null}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, href, warning = false }: { label: string; value: number | undefined; icon: typeof Users; href: string; warning?: boolean }) {
  return <Link href={href} className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-slate-300 hover:shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className={`mt-2 text-3xl font-bold ${warning ? "text-amber-700" : "text-slate-950"}`}>{value ?? "—"}</p></div><div className={`rounded-xl p-2.5 ${warning ? "bg-amber-50 text-amber-700" : "bg-brand-50 text-brand-700"}`}><Icon size={20} /></div></div><span className="mt-4 flex items-center text-xs font-semibold text-brand-700">Open <ArrowRight className="ml-1 transition group-hover:translate-x-0.5" size={13} /></span></Link>;
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5"><span className="text-slate-600">{label}</span><span className="font-bold text-slate-900">{value}</span></div>;
}
