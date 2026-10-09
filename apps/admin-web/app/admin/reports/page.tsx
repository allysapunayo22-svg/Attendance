"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchAttendanceReport } from "@/lib/queries";
import { downloadCsv, downloadPdf } from "@/lib/export";

function localDateKey(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value?: string | null) {
  return value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export default function ReportsPage() {
  const query = useQuery({ queryKey: ["reports-attendance"], queryFn: fetchAttendanceReport });
  const [eventFilter, setEventFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const options = useMemo(() => {
    const data = query.data ?? [];
    return {
      events: Array.from(new Set(data.map((row) => row.event?.title).filter((value): value is string => Boolean(value)))).sort(),
      courses: Array.from(new Set(data.map((row) => row.student?.course?.code).filter((value): value is string => Boolean(value)))).sort(),
      sections: Array.from(new Set(data.map((row) => row.student?.section?.name).filter((value): value is string => Boolean(value)))).sort()
    };
  }, [query.data]);

  const sourceRows = useMemo(() => (query.data ?? []).filter((row) => {
    const rowDate = localDateKey(row.time_in_server_timestamp);
    return (eventFilter === "all" || row.event?.title === eventFilter)
      && (courseFilter === "all" || row.student?.course?.code === courseFilter)
      && (sectionFilter === "all" || row.student?.section?.name === sectionFilter)
      && (!dateFrom || rowDate >= dateFrom)
      && (!dateTo || rowDate <= dateTo);
  }), [query.data, eventFilter, courseFilter, sectionFilter, dateFrom, dateTo]);

  const rows = sourceRows.map((row) => ({
    event: row.event?.title ?? "",
    student: row.student?.full_name ?? "",
    student_id: row.student?.student_id ?? "",
    course: row.student?.course?.code ?? "",
    section: row.student?.section?.name ?? "",
    time_in: displayDate(row.time_in_server_timestamp),
    time_out: displayDate(row.time_out_server_timestamp),
    distance_meters: row.time_in_distance ?? "",
    status: row.status,
    flags: row.suspicious_flags?.join("; ") ?? ""
  }));

  const hasFilters = eventFilter !== "all" || courseFilter !== "all" || sectionFilter !== "all" || dateFrom || dateTo;
  const disabled = query.isLoading || query.isError || rows.length === 0;
  const resetFilters = () => {
    setEventFilter("all"); setCourseFilter("all"); setSectionFilter("all"); setDateFrom(""); setDateTo("");
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Attendance reports</h1>
            <p className="mt-1 text-sm text-slate-500">Filter the complete attendance register, then export the current result.</p>
          </div>
          <details className="relative">
            <summary className={`flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl bg-brand-700 px-4 text-xs font-semibold text-white ${disabled ? "pointer-events-none opacity-50" : ""}`}>
              <Download size={15} /> Export <ChevronDown size={14} />
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => downloadCsv("attendance-report.csv", rows)}>CSV file</button>
              <button className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => downloadPdf("attendance-report.pdf", "Attendance Report", rows)}>PDF document</button>
            </div>
          </details>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FilterSelect label="Event" value={eventFilter} onChange={setEventFilter} values={options.events} />
            <FilterSelect label="Course" value={courseFilter} onChange={setCourseFilter} values={options.courses} />
            <FilterSelect label="Section" value={sectionFilter} onChange={setSectionFilter} values={options.sections} />
            <label><span className="mb-1 block text-xs font-semibold text-slate-600">From</span><Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
            <label><span className="mb-1 block text-xs font-semibold text-slate-600">To</span><Input type="date" min={dateFrom} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="font-medium text-slate-700">{query.isLoading ? "Loading records…" : `${rows.length} of ${query.data?.length ?? 0} records selected`}</p>
            {hasFilters ? <Button variant="outline" className="h-8 text-xs" onClick={resetFilters}><X size={13} /> Clear filters</Button> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-slate-200/80 shadow-xs">
        <CardContent className="p-0">
          {query.isError ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Attendance records could not be loaded. <button className="font-bold underline" onClick={() => void query.refetch()}>Try again</button></div> : null}
          {query.isLoading ? <div role="status" className="p-12 text-center text-sm text-slate-500">Loading the attendance register…</div> : null}
          {!query.isLoading && !query.isError ? <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-600"><tr><th className="px-5 py-3">Student</th><th className="px-5 py-3">Event</th><th className="px-5 py-3">Course / section</th><th className="px-5 py-3">Time in</th><th className="px-5 py-3">Time out</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row.student_id}-${row.event}-${index}`} className="hover:bg-slate-50"><td className="px-5 py-3"><p className="font-semibold text-slate-900">{row.student || "Unknown student"}</p><p className="text-xs text-slate-500">{row.student_id || "—"}</p></td><td className="px-5 py-3 text-slate-700">{row.event || "—"}</td><td className="px-5 py-3 text-slate-700">{[row.course, row.section].filter(Boolean).join(" / ") || "—"}</td><td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">{row.time_in}</td><td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">{row.time_out}</td><td className="px-5 py-3 capitalize text-slate-700">{row.status.replace(/_/g, " ")}</td></tr>)}</tbody>
          </table>{rows.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No attendance records match these filters.</div> : null}</div> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function FilterSelect({ label, value, onChange, values }: { label: string; value: string; onChange: (value: string) => void; values: string[] }) {
  return <label><span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"><option value="all">All {label.toLowerCase()}s</option>{values.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}
