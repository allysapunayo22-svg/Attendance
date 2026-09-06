"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fetchLiveAttendance } from "@/lib/queries";
import { downloadCsv, downloadExcel, downloadPdf } from "@/lib/export";

export default function ReportsPage() {
  const query = useQuery({ queryKey: ["reports-attendance"], queryFn: fetchLiveAttendance });
  const rows = (query.data ?? []).map((row) => ({
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
        <p className="mt-1 text-sm text-slate-500">Export event attendance, student records, compliance registries, and device telemetries.</p>
      </div>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardHeader className="p-5 border-b border-slate-100"><h2 className="text-base font-bold text-slate-900">Export Attendance Register</h2></CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-wrap gap-2.5">
            <Button className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 text-xs font-semibold text-white shadow-xs" onClick={() => downloadCsv("attendance-report.csv", rows)}><Download size={15} /><span>Export CSV</span></Button>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => downloadExcel("attendance-report.xlsx", rows)}><Download size={15} /><span>Export Excel</span></Button>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => downloadPdf("attendance-report.pdf", "Attendance Report", rows)}><Download size={15} /><span>Export PDF</span></Button>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
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
              {!rows.length ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-slate-500">No attendance data to export.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
