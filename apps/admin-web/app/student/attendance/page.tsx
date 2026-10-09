"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck2, ChevronRight, Clock3, Search } from "lucide-react";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { StudentRefreshButton } from "@/components/student/StudentRefreshButton";
import { StudentEmpty, StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAttendance } from "@/components/student/hooks";
import { attendanceNeedsReview, formatDateTime, isResolvedAttendance } from "@/lib/student/format";
import { OfflineAttendanceQueue } from "@/components/student/pwa/OfflineAttendanceQueue";

const filters = ["all", "resolved", "review", "late", "missed"] as const;
type AttendanceFilter = (typeof filters)[number];

export default function StudentAttendancePage() {
  const query = useStudentAttendance();
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return rows.filter((row) => {
      const filterMatch = filter === "all" || (filter === "resolved" && isResolvedAttendance(row.status)) || (filter === "review" && attendanceNeedsReview(row.status)) || row.status === filter;
      return filterMatch && (!value || `${row.event?.title ?? "event"} ${row.status}`.toLowerCase().includes(value));
    });
  }, [filter, rows, search]);

  if (query.isLoading) return <StudentLoading label="Loading server attendance history" />;
  if (query.isError) return <StudentError message="Your attendance records could not be loaded from the server." retry={() => void query.refetch()} />;

  return (
    <div className="space-y-5">
      <StudentPageHeader title="Attendance" description={`${rows.length} authoritative server record${rows.length === 1 ? "" : "s"}`} action={<StudentRefreshButton refreshing={query.isFetching} onRefresh={() => void query.refetch()} />} />
      <OfflineAttendanceQueue />
      <div className="grid grid-cols-3 gap-3"><Metric label="Total" value={rows.length} /><Metric label="Resolved" value={rows.filter((row) => isResolvedAttendance(row.status)).length} /><Metric label="Review" value={rows.filter((row) => attendanceNeedsReview(row.status)).length} /></div>
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search attendance history</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event or status" className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100" /></label><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold capitalize ${filter === item ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}</div></div>
      {filtered.length ? <div className="space-y-3">{filtered.map((row) => <Link key={row.id} href={`/student/attendance/${row.id}`} className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-5"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><CalendarCheck2 size={22} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate font-extrabold text-slate-950">{row.event?.title ?? "Campus event"}</h2><StudentStatusBadge value={row.status} /></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="flex items-center gap-1"><Clock3 size={13} /> Time in: {formatDateTime(row.time_in_server_timestamp ?? row.time_in_device_timestamp)}</span>{row.time_out_server_timestamp || row.time_out_device_timestamp ? <span>Time out: {formatDateTime(row.time_out_server_timestamp ?? row.time_out_device_timestamp)}</span> : null}</div></div><ChevronRight className="shrink-0 text-slate-400" size={18} /></Link>)}</div> : <StudentEmpty icon={CalendarCheck2} title="No attendance records" description={search || filter !== "all" ? "Try another search or filter." : "Authoritative records will appear after an attendance submission reaches the server."} />}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-3xl border border-slate-200/70 bg-white p-3 text-center shadow-sm sm:p-4"><p className="text-2xl font-black text-slate-950">{value}</p><p className="text-[11px] font-bold text-slate-500 sm:text-xs">{label}</p></div>;
}
