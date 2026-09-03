"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, labelize } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchLiveAttendance } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

export function LiveAttendanceTable() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["live-attendance"], queryFn: fetchLiveAttendance, refetchInterval: 20_000 });

  useEffect(() => {
    const channel = supabase
      .channel("live-attendance")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_sessions" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-attendance"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  if (query.isLoading) return <Card><CardContent>Loading live attendance</CardContent></Card>;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Time In</th>
              <th className="px-4 py-3">Time Out</th>
              <th className="px-4 py-3">Distance</th>
              <th className="px-4 py-3">GPS</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Flags</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-950">{row.student?.full_name ?? "-"}</div>
                  <div className="text-xs text-slate-500">{row.student?.student_id ?? "-"}</div>
                </td>
                <td className="px-4 py-3">{row.event?.title ?? "-"}</td>
                <td className="px-4 py-3">{row.time_in_server_timestamp ? new Date(row.time_in_server_timestamp).toLocaleTimeString() : "-"}</td>
                <td className="px-4 py-3">{row.time_out_server_timestamp ? new Date(row.time_out_server_timestamp).toLocaleTimeString() : "-"}</td>
                <td className="px-4 py-3">{row.time_in_distance ? `${Math.round(row.time_in_distance)} m` : "-"}</td>
                <td className="px-4 py-3">{row.time_in_accuracy ? `${Math.round(row.time_in_accuracy)} m` : "-"}</td>
                <td className="px-4 py-3"><Badge tone={row.status}>{labelize(row.status)}</Badge></td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.suspicious_flags?.join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
