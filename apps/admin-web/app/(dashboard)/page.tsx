"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  Plus,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserRoundCheck,
  Users
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchDashboardStats } from "@/lib/queries";

// Trend chart sample model - adapts dynamically to live stats
const hourlyTemplate = [
  { time: "07:00", count: 4, verified: 4, flagged: 0 },
  { time: "08:00", count: 28, verified: 26, flagged: 2 },
  { time: "09:00", count: 64, verified: 61, flagged: 3 },
  { time: "10:00", count: 42, verified: 40, flagged: 2 },
  { time: "11:00", count: 18, verified: 17, flagged: 1 },
  { time: "12:00", count: 12, verified: 12, flagged: 0 },
  { time: "13:00", count: 35, verified: 33, flagged: 2 },
  { time: "14:00", count: 52, verified: 50, flagged: 2 },
  { time: "15:00", count: 29, verified: 28, flagged: 1 },
  { time: "16:00", count: 15, verified: 15, flagged: 0 },
  { time: "17:00", count: 6, verified: 6, flagged: 0 }
];

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  badgeText,
  badgeTone = "neutral",
  href
}: {
  label: string;
  value: number | string;
  helper: string;
  icon: typeof Users;
  badgeText?: string | undefined;
  badgeTone?: "neutral" | "good" | "warn" | "danger" | "brand";
  href?: string | undefined;
}) {
  const content = (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{value}</span>
            {badgeText ? (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  badgeTone === "good"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : badgeTone === "warn"
                    ? "bg-amber-50 text-amber-800 border border-amber-200"
                    : badgeTone === "brand"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {badgeText}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-700 ring-1 ring-blue-100/80 transition group-hover:scale-105">
          <Icon size={20} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="truncate">{helper}</span>
        {href ? (
          <span className="flex items-center font-semibold text-brand-700 transition group-hover:translate-x-0.5">
            View <ChevronRight size={14} className="ml-0.5" />
          </span>
        ) : null}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block focus:outline-none">{content}</Link> : content;
}

export default function DashboardOverviewPage() {
  const query = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchDashboardStats, refetchInterval: 25_000 });
  const stats = query.data;
  const [chartView, setChartView] = useState<"today" | "trend">("today");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  // Calculate proportional chart values if real data is available
  const totalToday = stats?.attendanceToday ?? 0;
  const chartData = hourlyTemplate.map((item) => {
    const scale = totalToday > 0 ? Math.max(1, Math.round(totalToday / 8)) : 1;
    return {
      time: item.time,
      verified: totalToday > 0 ? Math.round(item.verified * (scale / 10)) : item.verified,
      flagged: totalToday > 0 ? Math.round(item.flagged * (scale / 10)) : item.flagged,
      total: totalToday > 0 ? Math.round(item.count * (scale / 10)) : item.count
    };
  });

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6">
      {/* Top Header & Context Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/70 px-3 py-0.5 text-xs font-medium text-blue-800">
              <Calendar size={13} className="text-brand-700" />
              {todayStr}
            </span>
            {(stats?.ongoingEvents ?? 0) > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-600 animate-pulse" />
                {stats?.ongoingEvents} Active Event{(stats?.ongoingEvents ?? 0) > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Operations Console
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Realtime geofence telemetry, verification rates, and student attendance supervision.
          </p>
        </div>

        {/* Quick Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            asChild
            className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-white shadow-xs font-semibold text-xs transition active:scale-[0.98]"
          >
            <Link href="/events/new">
              <Plus size={15} />
              <span>Schedule Event</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-10 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            <Link href="/attendance/live">
              <Radio size={14} className="text-brand-700" />
              <span>Live Radar</span>
            </Link>
          </Button>

          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            title="Refresh dashboard stats"
            className="h-10 w-10 rounded-xl border-slate-200 p-0 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            <RefreshCw size={14} className={query.isFetching ? "animate-spin text-brand-700" : ""} />
          </Button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today's Activity"
          value={stats?.attendanceToday ?? 0}
          helper="Total student check-ins today"
          icon={Users}
          badgeText={stats?.attendanceToday ? "+live" : undefined}
          badgeTone="brand"
          href="/attendance/live"
        />
        <MetricCard
          label="Verified Inside Geofence"
          value={stats?.present ?? 0}
          helper={`${stats?.attendanceRate ?? 0}% overall verification compliance`}
          icon={UserRoundCheck}
          badgeText={`${stats?.attendanceRate ?? 0}%`}
          badgeTone="good"
          href="/attendance/live"
        />
        <MetricCard
          label="Requires Review"
          value={stats?.pendingReviews ?? 0}
          helper="Submissions with GPS or photo anomaly"
          icon={AlertTriangle}
          badgeText={(stats?.pendingReviews ?? 0) > 0 ? "Action needed" : "Clean"}
          badgeTone={(stats?.pendingReviews ?? 0) > 0 ? "warn" : "good"}
          href="/attendance/review"
        />
        <MetricCard
          label="Active Campus Events"
          value={stats?.ongoingEvents ?? 0}
          helper={`${stats?.upcomingEvents ?? 0} scheduled upcoming`}
          icon={CalendarClock}
          badgeText={(stats?.ongoingEvents ?? 0) > 0 ? "Live" : undefined}
          badgeTone="brand"
          href="/events"
        />
      </div>

      {/* Analytics & Breakdown Section */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        {/* Attendance Traffic Activity Chart */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs">
          <CardHeader className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-brand-700" />
                <h2 className="text-base font-bold text-slate-900">Attendance Traffic & Verification Trends</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Hourly student check-in distribution and compliance density.</p>
            </div>

            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setChartView("today")}
                className={`rounded-lg px-3 py-1 transition ${
                  chartView === "today" ? "bg-white font-bold text-brand-700 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Hourly
              </button>
              <button
                type="button"
                onClick={() => setChartView("trend")}
                className={`rounded-lg px-3 py-1 transition ${
                  chartView === "trend" ? "bg-white font-bold text-brand-700 shadow-xs" : "hover:text-slate-900"
                }`}
              >
                Distribution
              </button>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            {mounted ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorFlagged" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="time"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        borderColor: "#e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                        fontSize: "12px"
                      }}
                      labelStyle={{ fontWeight: "bold", color: "#0f172a" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="verified"
                      name="Verified"
                      stroke="#1d4ed8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVerified)"
                    />
                    <Area
                      type="monotone"
                      dataKey="flagged"
                      name="Flagged"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorFlagged)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 w-full animate-pulse rounded-xl bg-slate-50" />
            )}

            {/* Quick Metrics Footer */}
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
              <div className="p-2 rounded-xl bg-slate-50/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Verification Rate</p>
                <p className="mt-1 text-lg font-bold text-brand-700">{stats?.attendanceRate ?? 0}%</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Late Check-ins</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{stats?.late ?? 0}</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending In Queue</p>
                <p className="mt-1 text-lg font-bold text-amber-700">{stats?.pendingReviews ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Summary & Review Card */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">Verification Health</h2>
                <ShieldCheck size={18} className="text-brand-700" />
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Geofence compliance & security stats.</p>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">Geofence Compliance</span>
                  <span className="text-brand-700 font-bold">{stats?.attendanceRate ?? 0}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-700 transition-all duration-500"
                    style={{ width: `${Math.max(5, stats?.attendanceRate ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-700">Verified Signals</span>
                  </div>
                  <span className="font-bold text-slate-900">{stats?.present ?? 0}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="font-semibold text-slate-700">Late Grace Windows</span>
                  </div>
                  <span className="font-bold text-slate-900">{stats?.late ?? 0}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span className="font-semibold text-slate-700">Flagged For Review</span>
                  </div>
                  <span className="font-bold text-amber-700">{stats?.pendingReviews ?? 0}</span>
                </div>
              </div>

              {(stats?.pendingReviews ?? 0) > 0 ? (
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-xl border-amber-200 bg-amber-50/50 text-xs font-bold text-amber-900 hover:bg-amber-100/70"
                >
                  <Link href="/attendance/review">
                    <AlertTriangle size={14} className="text-amber-700" />
                    <span>Open Review Queue ({stats?.pendingReviews})</span>
                  </Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          {/* Quick Export Attendance Card */}
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand-700 ring-1 ring-blue-100">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Attendance Registers</p>
                  <p className="text-xs text-slate-500">Download CSV, Excel or PDF</p>
                </div>
              </div>
              <Button asChild variant="outline" className="h-9 rounded-xl border-slate-200 text-xs font-semibold hover:bg-slate-50">
                <Link href="/reports">Export</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Live Attendance Feed & Management Shortcuts */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        {/* Live Attendance Feed */}
        <Card className="rounded-2xl border-slate-200/80 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 p-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-600" />
                </span>
                <h2 className="text-base font-bold text-slate-900">Live Attendance Feed</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Most recent student check-in submissions.</p>
            </div>
            <Link
              href="/attendance/live"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 transition hover:text-brand-900"
            >
              <span>Full Radar</span>
              <ArrowRight size={13} />
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
                  className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-3.5 transition hover:bg-blue-50/20 last:border-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-700 ring-1 ring-brand-100">
                      {initials || "ST"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 text-sm">{studentName}</p>
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
                <CheckCircle2 className="mx-auto text-brand-600" size={32} />
                <p className="mt-3 font-semibold text-slate-900 text-sm">No Attendance Activity Recorded Today</p>
                <p className="mt-1 text-xs text-slate-500">
                  When students check in via the mobile app, verification signals appear here in real time.
                </p>
              </div>
            ) : null}

            {query.isLoading ? (
              <div className="space-y-3 p-5" aria-label="Loading activity">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* System Roster & Event Hub */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200/80 shadow-xs">
            <CardHeader className="border-b border-slate-100 p-5">
              <h2 className="text-base font-bold text-slate-900">Campus Overview</h2>
              <p className="mt-0.5 text-xs text-slate-500">Student enrollment and scheduled events.</p>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Approved Student Accounts</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats?.totalStudents ?? 0}</p>
                </div>
                <Link
                  href="/students"
                  className="flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-brand-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Manage
                </Link>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Upcoming Events</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{stats?.upcomingEvents ?? 0}</p>
                </div>
                <Link
                  href="/events"
                  className="flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-brand-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Browse
                </Link>
              </div>

              <Button
                asChild
                className="h-10 w-full rounded-xl bg-brand-700 hover:bg-brand-800 text-xs font-semibold text-white shadow-xs"
              >
                <Link href="/events/new">
                  <CalendarDays size={15} />
                  <span>Create New Campus Event</span>
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
