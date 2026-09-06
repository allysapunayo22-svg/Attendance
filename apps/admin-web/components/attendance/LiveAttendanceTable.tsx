"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Radio,
  Search,
  Smartphone,
  User,
  X
} from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchLiveAttendance } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

type AttendanceRow = Awaited<ReturnType<typeof fetchLiveAttendance>>[number];

export function LiveAttendanceTable() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["live-attendance"],
    queryFn: fetchLiveAttendance,
    refetchInterval: 15_000
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "late" | "requires_review">("all");
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRow | null>(null);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);

  // Realtime Supabase change listener
  useEffect(() => {
    const channel = supabase
      .channel("live-attendance-radar")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_sessions" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-attendance"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Load photo signed URL when a record is selected
  useEffect(() => {
    setEvidenceUrl(null);
    if (selectedRecord?.time_in_photo_path) {
      void supabase.storage
        .from("attendance-evidence")
        .createSignedUrl(selectedRecord.time_in_photo_path, 300)
        .then(({ data }) => setEvidenceUrl(data?.signedUrl ?? null));
    }
  }, [selectedRecord]);

  const rawRows = query.data ?? [];

  const filteredRows = useMemo(() => {
    return rawRows.filter((row) => {
      const matchSearch =
        !searchTerm.trim() ||
        `${row.student?.full_name} ${row.student?.student_id} ${row.event?.title}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "requires_review" && (row.status === "pending_verification" || row.sync_status === "requires_review")) ||
        row.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [rawRows, searchTerm, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by student name, ID, or event…"
            className="h-10 rounded-xl border-slate-200 bg-white pl-9 text-xs shadow-xs focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "all" ? "bg-white font-semibold text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            All ({rawRows.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("verified")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "verified" ? "bg-white font-semibold text-emerald-700 shadow-xs" : "hover:text-emerald-700"
            }`}
          >
            Verified
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("late")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "late" ? "bg-white font-semibold text-amber-700 shadow-xs" : "hover:text-amber-700"
            }`}
          >
            Late
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("requires_review")}
            className={`rounded-lg px-3 py-1.5 transition ${
              statusFilter === "requires_review" ? "bg-white font-semibold text-amber-800 shadow-xs" : "hover:text-amber-800"
            }`}
          >
            Flagged
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5">Student Profile</th>
                <th className="px-4 py-3.5">Campus Event</th>
                <th className="px-4 py-3.5">Time In</th>
                <th className="px-4 py-3.5">Time Out</th>
                <th className="px-4 py-3.5">GPS Distance</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const isFlagged = row.sync_status === "requires_review" || row.status === "pending_verification";

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedRecord(row)}
                    className="cursor-pointer transition hover:bg-blue-50/30"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-sm">{row.student?.full_name ?? "Student"}</div>
                      <div className="text-xs font-medium text-slate-500">{row.student?.student_id ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="max-w-xs truncate font-medium text-slate-800">{row.event?.title ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                      {row.time_in_server_timestamp
                        ? new Date(row.time_in_server_timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">
                      {row.time_out_server_timestamp
                        ? new Date(row.time_out_server_timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      {row.time_in_distance != null ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                          <MapPin size={13} className="text-brand-700" />
                          {Math.round(row.time_in_distance)}m away
                          {row.time_in_accuracy ? <span className="text-slate-400">(±{Math.round(row.time_in_accuracy)}m)</span> : null}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge tone={isFlagged ? "requires_review" : row.status}>
                        {labelize(isFlagged ? "Requires Review" : row.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(row);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50 hover:border-brand-200 shadow-xs transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!query.isLoading && filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    No attendance records match your search or filter.
                  </td>
                </tr>
              ) : null}

              {query.isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-slate-500">
                    Loading live attendance records…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspector Drawer / Modal */}
      {selectedRecord ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedRecord(null)}
              aria-label="Close details"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-white font-bold">
                {selectedRecord.student?.full_name?.charAt(0) ?? "S"}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedRecord.student?.full_name ?? "Student"}</h3>
                <p className="text-xs text-slate-500">
                  {selectedRecord.student?.student_id} · {selectedRecord.event?.title}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <span className="font-semibold text-slate-500">Verification Status</span>
                <div className="mt-1">
                  <Badge tone={selectedRecord.status}>{labelize(selectedRecord.status)}</Badge>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <span className="font-semibold text-slate-500">GPS Offset</span>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedRecord.time_in_distance != null ? `${Math.round(selectedRecord.time_in_distance)} meters` : "N/A"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <span className="font-semibold text-slate-500">Time In Timestamp</span>
                <p className="mt-1 font-bold text-slate-900">
                  {selectedRecord.time_in_server_timestamp ? new Date(selectedRecord.time_in_server_timestamp).toLocaleTimeString() : "—"}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3">
                <span className="font-semibold text-slate-500">Device Telemetry</span>
                <p className="mt-1 font-bold text-slate-900 truncate">
                  {(selectedRecord as any).device_id ? "Verified Mobile Device" : "Standard Mobile Device"}
                </p>
              </div>
            </div>

            {/* Photo evidence preview */}
            <div className="mt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Submitted Photo Evidence</span>
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {evidenceUrl ? (
                  <Image
                    src={evidenceUrl}
                    alt="Student Attendance Evidence"
                    width={480}
                    height={320}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-xs text-slate-400">
                    No photo attached for this record
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="h-9 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
