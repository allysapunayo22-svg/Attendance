"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileSpreadsheet,
  Plus,
  Radio,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserRoundCheck,
  Users
} from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/queries";

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "neutral",
  href
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: typeof Users;
  tone?: "neutral" | "good" | "warn" | "danger" | "brand";
  href?: string;
}) {
  const toneStyles = {
    neutral: {
      bg: "bg-slate-50 text-slate-700",
      border: "border-slate-200/80",
      iconBg: "bg-white text-slate-700 ring-1 ring-slate-200"
    },
    good: {
      bg: "bg-emerald-50/50 text-emerald-900",
      border: "border-emerald-200/60",
      iconBg: "bg-emerald-100/70 text-emerald-700"
    },
    warn: {
      bg: "bg-amber-50/50 text-amber-900",
      border: "border-amber-200/70",
      iconBg: "bg-amber-100 text-amber-700"
    },
    danger: {
      bg: "bg-rose-50/50 text-rose-900",
      border: "border-rose-200/70",
      iconBg: "bg-rose-100 text-rose-700"
    },
    brand: {
      bg: "bg-emerald-50/60 text-emerald-950",
      border: "border-emerald-200/80",
      iconBg: "bg-emerald-100 text-[#0f766e]"
    }
  };

  const current = toneStyles[tone];

  const content = (
    <div className={`group relative overflow-hidden rounded-2xl border ${current.border} bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{helper}</p>
        </div>
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${current.iconBg} shadow-sm transition-transform duration-200 group-hover:scale-105`}>
          <Icon size={22} />
        </div>
      </div>
      {href ? (
        <div className="mt-4 flex items-center text-xs font-bold text-[#0f766e] transition group-hover:translate-x-1 group-hover:text-emerald-900">
          <span>View details</span>
          <ChevronRight size={14} className="ml-1" />
        </div>
      ) : null}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function DashboardOverviewPage() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 25_000 });
  const stats = query.data;

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#042f2e] via-[#0a3831] to-[#0a1622] p-6 text-white shadow-xl shadow-slate-950/20 lg:p-8">
        {/* Subtle background glow circle */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-emerald-200 border border-emerald-400/20 backdrop-blur-sm">
                <Sparkles size={13} className="text-emerald-300" />
                {todayStr}
              </span>
              {(stats?.ongoingEvents ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 border border-emerald-400/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  {stats?.ongoingEvents} Ongoing Events
                </span>
              ) : null}
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white">
              Campus Operations Console
            </h1>
            <p className="text-sm font-medium text-emerald-100/80">
              Live geofence verification signals, student rosters, and real-time attendance telemetries.
            </p>
          </div>

          {/* Quick Action Chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              asChild
              className="h-10 rounded-xl bg-white text-xs font-bold text-[#0f766e] shadow-md transition hover:bg-emerald-50 active:scale-[0.98]"
            >
              <Link href="/events/new">
                <Plus size={15} />
                <span>Create Event</span>
              </Link>
            </Button>

            <Button
              asChild
              className="h-10 rounded-xl border border-white/20 bg-white/10 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
            >
              <Link href="/attendance/live">
                <Radio size={15} className="text-emerald-300" />
                <span>Live Radar</span>
              </Link>
            </Button>

            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              className="h-10 rounded-xl border-white/20 bg-white/10 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
            >
              <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
      </div>

      {/* Needs Attention Section */}
      <section aria-labelledby="attention-heading">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="attention-heading" className="text-lg font-black tracking-tight text-slate-950">
              Items Requiring Action
            </h2>
            {(stats?.pendingReviews ?? 0) > 0 ? (
              <span className="flex h-5 items-center rounded-full bg-amber-100 px-2 text-xs font-black text-amber-800">
                {stats?.pendingReviews} Flagged
              </span>
            ) : null}
          </div>
          <Link
            href="/attendance/review"
            className="flex items-center gap-1 text-xs font-bold text-[#0f766e] transition hover:text-emerald-900"
          >
            <span>Open Review Queue</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Pending Reviews"
            value={stats?.pendingReviews ?? 0}
            helper="Flagged for GPS offset or device anomaly"
            icon={AlertTriangle}
            tone={(stats?.pendingReviews ?? 0) > 0 ? "warn" : "good"}
            href="/attendance/review"
          />
          <MetricCard
            label="Ongoing Events"
            value={stats?.ongoingEvents ?? 0}
            helper="Actively enforcing geofenced check-in"
            icon={CalendarClock}
            tone="brand"
            href="/events"
          />
          <MetricCard
            label="Pending Absences"
            value={stats?.pendingAbsenceRequests ?? 0}
            helper="Medical or official excuse requests"
            icon={ClipboardCheck}
            tone={(stats?.pendingAbsenceRequests ?? 0) > 0 ? "warn" : "neutral"}
            href="/attendance/review"
          />
        </div>
      </section>

      {/* Today's Operational Telemetry */}
      <section aria-labelledby="today-heading">
        <h2 id="today-heading" className="mb-3 text-lg font-black tracking-tight text-slate-950">
          Today's Telemetry
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total Activity"
            value={stats?.attendanceToday ?? 0}
            helper="Check-ins recorded today"
            icon={Users}
            tone="brand"
            href="/attendance/live"
          />
          <MetricCard
            label="Verified Check-ins"
            value={stats?.present ?? 0}
            helper="Strictly inside geofence perimeter"
            icon={UserRoundCheck}
            tone="good"
          />
          <MetricCard
            label="Late Submissions"
            value={stats?.late ?? 0}
            helper="Submitted during late grace window"
            icon={Clock3}
            tone={(stats?.late ?? 0) > 0 ? "warn" : "neutral"}
          />
          <MetricCard
            label="Verification Rate"
            value={`${stats?.attendanceRate ?? 0}%`}
            helper="Processed without violation"
            icon={CheckCircle2}
            tone="good"
          />
        </div>
      </section>

      {/* Activity Stream & Quick Launch */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Live Attendance Stream */}
        <Card className="rounded-3xl border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h2 className="text-base font-black text-slate-950">Live Attendance Feed</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Most recent verified time-ins and check-outs.</p>
            </div>
            <Link
              href="/attendance/live"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              Open Live Radar →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {(stats?.recentActivity ?? []).map((row) => {
              const studentName = row.student?.[0]?.full_name ?? "Student";
              const initials = studentName
                .split(" ")
                .map((n: string) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              return (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5 transition hover:bg-slate-50/70 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#0f766e] to-[#047857] text-xs font-bold text-white shadow-sm">
                      {initials || "ST"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-950 text-sm">{studentName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {row.event?.[0]?.title ?? "Campus Event"} ·{" "}
                        {new Date(row.updated_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <Badge tone={row.sync_status === "requires_review" ? "requires_review" : row.status}>
                    {labelize(row.sync_status === "requires_review" ? row.sync_status : row.status)}
                  </Badge>
                </div>
              );
            })}

            {!query.isLoading && !stats?.recentActivity?.length ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="mx-auto text-emerald-600" size={32} />
                <p className="mt-3 font-bold text-slate-950 text-sm">No Attendance Activity Recorded Yet</p>
                <p className="mt-1 text-xs text-slate-500">
                  When students scan and submit attendance from the mobile app, records appear here live.
                </p>
              </div>
            ) : null}

            {query.isLoading ? (
              <div className="space-y-3 p-5" aria-label="Loading activity">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Quick Hub & Shortcuts */}
        <div className="space-y-4">
          <Card className="rounded-3xl border-slate-200/80 shadow-sm">
            <CardHeader className="border-b border-slate-100 p-5">
              <h2 className="text-base font-black text-slate-950">Campus Roster & Events</h2>
              <p className="mt-0.5 text-xs text-slate-500">System database status.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Verified Student Accounts</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats?.totalStudents ?? 0}</p>
                </div>
                <Link
                  href="/students"
                  className="flex h-9 items-center rounded-xl bg-white px-3 text-xs font-bold text-[#0f766e] shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50"
                >
                  Manage
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Upcoming Scheduled Events</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{stats?.upcomingEvents ?? 0}</p>
                </div>
                <Link
                  href="/events"
                  className="flex h-9 items-center rounded-xl bg-white px-3 text-xs font-bold text-[#0f766e] shadow-sm ring-1 ring-slate-200 hover:bg-emerald-50"
                >
                  Browse
                </Link>
              </div>

              <Button
                asChild
                className="h-11 w-full rounded-xl bg-gradient-to-r from-[#0f766e] to-[#047857] text-xs font-bold text-white shadow-md shadow-emerald-950/20 hover:from-[#115e59] hover:to-[#065f46]"
              >
                <Link href="/events/new">
                  <CalendarDays size={16} />
                  <span>Schedule New Campus Event</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Reports Card */}
          <Card className="rounded-3xl border-slate-200/80 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#0f766e]">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-950">Export Attendance Register</p>
                  <p className="text-xs text-slate-500">Generate CSV & Excel sheets</p>
                </div>
              </div>
              <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-bold hover:bg-slate-50">
                <Link href="/reports">Export</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
