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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Export event, student, course, section, monthly, late, absent, excused, and verification issue reports.</p>
      </div>
      <Card>
        <CardHeader><h2 className="text-lg font-bold">Attendance Export</h2></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => downloadCsv("attendance-report.csv", rows)}><Download size={16} />CSV</Button>
            <Button variant="outline" onClick={() => downloadExcel("attendance-report.xlsx", rows)}><Download size={16} />Excel</Button>
            <Button variant="outline" onClick={() => downloadPdf("attendance-report.pdf", "Attendance Report", rows)}><Download size={16} />PDF</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {Object.keys(rows[0] ?? { event: "", student: "", status: "" }).map((key) => <th key={key} className="px-4 py-3">{key}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.student_id}-${index}`} className="border-t border-slate-200">
                  {Object.values(row).map((value, cellIndex) => <td key={cellIndex} className="px-4 py-3">{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
