"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchLiveAttendance } from "@/lib/queries";
import { downloadCsv, downloadExcel, downloadPdf } from "@/lib/export";

function localDateKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ReportsPage() {
  const query = useQuery({ queryKey: ["reports-attendance"], queryFn: fetchLiveAttendance });
  const [eventFilter, setEventFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const eventNames = useMemo(() => Array.from(new Set((query.data ?? []).map((row) => row.event?.title).filter((title): title is string => Boolean(title)))).sort(), [query.data]);
  const sourceRows = (query.data ?? []).filter((row) => {
    const matchesEvent = eventFilter === "all" || row.event?.title === eventFilter;
    const matchesDate = !dateFilter || (row.time_in_server_timestamp ? localDateKey(row.time_in_server_timestamp) === dateFilter : false);
    return matchesEvent && matchesDate;
  });
  const rows = sourceRows.map((row) => ({
    event: row.event?.title ?? "",
    student: row.student?.full_name ?? "",
    student_id: row.student?.student_id ?? "",
    time_in: row.time_in_server_timestamp ?? "",
    time_out: row.time_out_server_timestamp ?? "",
    distance_meters: row.time_in_distance ?? "",
    gps_accuracy: row.time_in_accuracy ?? "",
    status: row.status,
    flags: row.suspicious_flags?.join(";") ?? ""
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Filter, review, and export the latest attendance records and verification telemetry.</p>
      </div>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100"><h2 className="text-base font-bold text-slate-900">Export Attendance Register</h2></CardHeader>
        <CardContent className="p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-semibold text-slate-600">Event</span><select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All events</option>{eventNames.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-600">Attendance date</span><Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} /></label>
          </div>
          <p className="mb-3 text-xs text-slate-500">{query.isLoading ? "Loading records…" : `${rows.length} record${rows.length === 1 ? "" : "s"} selected`}</p>
          <div className="flex flex-wrap gap-2.5">
            <Button disabled={query.isLoading || query.isError || !rows.length} className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-xs font-semibold text-white shadow-xs" onClick={() => downloadCsv("attendance-report.csv", rows)}><Download size={15} /><span>Export CSV</span></Button>
            <Button disabled={query.isLoading || query.isError || !rows.length} variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => downloadExcel("attendance-report.xlsx", rows)}><Download size={15} /><span>Export Excel</span></Button>
            <Button disabled={query.isLoading || query.isError || !rows.length} variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => downloadPdf("attendance-report.pdf", "Attendance Report", rows)}><Download size={15} /><span>Export PDF</span></Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardContent className="p-0">
          {query.isError ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Attendance records could not be loaded. <button className="font-bold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}
          {query.isLoading ? <div role="status" className="p-12 text-center text-sm text-slate-500">Loading attendance records…</div> : null}
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {Object.keys(rows[0] ?? { event: "", student: "", status: "" }).map((key) => <th key={key} className="px-5 py-3.5">{key.replace(/_/g, " ")}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={`${row.student_id}-${index}`} className="transition hover:bg-blue-50/20">
                  {Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-5 py-3.5 text-xs text-slate-700 font-medium">{value || "—"}</td>)}
                </tr>
              ))}
              {!query.isLoading && !query.isError && !rows.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">No attendance data to export.</td>
                </tr>
              ) : null}
            </tbody>
          </table></div>
          {!query.isLoading && !query.isError ? <div className="divide-y divide-slate-100 md:hidden">{rows.map((row, index) => <article key={`${row.student_id}-${index}`} className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{row.student || "Unknown student"}</h3><p className="text-xs text-slate-500">{row.student_id || "No student ID"}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{row.status}</span></div><p className="text-sm text-slate-700">{row.event || "Unknown event"}</p><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-slate-500">Time in</dt><dd className="break-words font-medium">{row.time_in || "—"}</dd></div><div><dt className="text-slate-500">Time out</dt><dd className="break-words font-medium">{row.time_out || "—"}</dd></div></dl></article>)}{!rows.length ? <div className="p-10 text-center text-sm text-slate-500">No attendance records match these filters.</div> : null}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}
