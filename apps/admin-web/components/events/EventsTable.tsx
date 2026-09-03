"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileDown,
  Pencil,
  Search,
  Send,
  Trash2,
  XCircle,
  type LucideIcon
} from "lucide-react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { downloadCsv } from "@/lib/export";
import { fetchEvents } from "@/lib/queries";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type EventRow = Awaited<ReturnType<typeof fetchEvents>>[number];
type SortKey = "title" | "date" | "venue" | "status";
type SortDirection = "asc" | "desc";

const pageSize = 10;
const statusFilters = ["all", "draft", "published", "ongoing", "completed", "cancelled"] as const;

export function EventsTable() {
  const queryClient = useQueryClient();
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const query = useQuery({ queryKey: ["events"], queryFn: fetchEvents });
  const rows = query.data ?? [];

  useEffect(() => {
    setPageIndex(0);
  }, [search, statusFilter, dateFilter, sortKey, sortDirection]);

  async function runAction(actionKey: string, action: () => Promise<void>, successMessage: string) {
    setBusyAction(actionKey);
    setNotice(null);

    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["events"] });
      setNotice({ tone: "success", message: successMessage });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Action failed. Please try again." });
    } finally {
      setBusyAction(null);
    }
  }

  async function updateStatus(id: string, status: string) {
    await runAction(
      `${id}-${status}`,
      async () => {
        const { error } = await supabase.from("events").update({ status }).eq("id", id);
        if (error) throw error;
      },
      `Event marked as ${labelize(status)}.`
    );
  }

  async function softDelete(id: string) {
    await runAction(
      `${id}-delete`,
      async () => {
        const { error } = await supabase.from("events").update({ deleted_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      },
      "Event deleted."
    );
  }

  async function duplicate(row: EventRow) {
    await runAction(
      `${row.id}-duplicate`,
      async () => {
        const { error } = await supabase.from("events").insert({
          title: `${row.title} Copy`,
          description: row.description,
          type: row.type,
          requirement: row.requirement,
          status: "draft",
          photo_required: row.photo_required,
          time_out_photo_required: row.time_out_photo_required,
          dynamic_qr_required: row.dynamic_qr_required,
          minimum_attendance_minutes: row.minimum_attendance_minutes,
          max_participants: row.max_participants,
          registration_deadline: row.registration_deadline,
          notification_schedule: row.notification_schedule
        });

        if (error) throw error;
      },
      "Event duplicated as a draft."
    );
  }

  function exportEvent(row: EventRow) {
    const stats = eventStats(row);
    downloadCsv(`${row.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-event.csv`, [
      {
        title: row.title,
        date: eventDate(row),
        venue: eventVenue(row),
        status: labelize(row.status),
        present: stats.present,
        late: stats.late,
        absent: stats.absent
      }
    ]);
    setNotice({ tone: "success", message: "CSV export downloaded." });
  }

  const summary = useMemo(() => {
    return {
      total: rows.length,
      published: rows.filter((row) => row.status === "published").length,
      draft: rows.filter((row) => row.status === "draft").length,
      cancelled: rows.filter((row) => row.status === "cancelled").length
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !normalizedSearch ||
        [row.title, row.description, eventVenue(row), row.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      const matchesDate = !dateFilter || eventDate(row) === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [dateFilter, rows, search, statusFilter]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((first, second) => {
      const firstValue = sortValue(first, sortKey);
      const secondValue = sortValue(second, sortKey);
      const result = firstValue.localeCompare(secondValue, undefined, { numeric: true, sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [filteredRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, totalPages - 1);
  const pagedRows = sortedRows.slice(safePageIndex * pageSize, safePageIndex * pageSize + pageSize);
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all" || Boolean(dateFilter);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "date" ? "desc" : "asc");
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("");
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Total events" value={summary.total} tone="slate" />
        <SummaryCard label="Published" value={summary.published} tone="teal" />
        <SummaryCard label="Drafts" value={summary.draft} tone="amber" />
        <SummaryCard label="Cancelled" value={summary.cancelled} tone="red" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-black text-slate-950">Events</h2>
              <p className="mt-1 text-sm text-slate-500">Filter, sort, publish, duplicate, export, or edit attendance events.</p>
            </div>
            {notice ? (
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold",
                  notice.tone === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                )}
              >
                {notice.message}
              </div>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_170px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 focus:bg-white"
                placeholder="Search event title, venue, or status"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-brand-700 focus:bg-white focus:ring-2 focus:ring-brand-100"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as (typeof statusFilters)[number])}
            >
              {statusFilters.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : labelize(status)}
                </option>
              ))}
            </select>
            <Input
              className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
            />
            <Button variant="outline" className="h-11 rounded-xl border-slate-200" onClick={clearFilters} disabled={!hasFilters}>
              Reset
            </Button>
          </div>
        </div>

        {pagedRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <SortableHeader label="Event title" sortKey="title" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader label="Date" sortKey="date" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader label="Venue" sortKey="venue" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <SortableHeader label="Status" sortKey="status" activeSortKey={sortKey} direction={sortDirection} onSort={toggleSort} />
                    <th className="px-5 py-3 font-black">Present</th>
                    <th className="px-5 py-3 font-black">Late</th>
                    <th className="px-5 py-3 font-black">Absent</th>
                    <th className="px-5 py-3 font-black">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedRows.map((row) => {
                    const stats = eventStats(row);

                    return (
                      <tr key={row.id} className="group bg-white transition hover:bg-slate-50/80">
                        <td className="max-w-xs px-5 py-4 align-middle">
                          <div className="font-black text-slate-950">{row.title}</div>
                          <div className="mt-1 line-clamp-1 text-xs text-slate-500">{row.description}</div>
                        </td>
                        <td className="px-5 py-4 align-middle font-semibold text-slate-700">{eventDate(row) || "-"}</td>
                        <td className="px-5 py-4 align-middle text-slate-700">{eventVenue(row) || "-"}</td>
                        <td className="px-5 py-4 align-middle">
                          <Badge tone={row.status}>{labelize(row.status)}</Badge>
                        </td>
                        <td className="px-5 py-4 align-middle font-semibold text-slate-900">{stats.present}</td>
                        <td className="px-5 py-4 align-middle font-semibold text-slate-900">{stats.late}</td>
                        <td className="px-5 py-4 align-middle font-semibold text-slate-900">{stats.absent}</td>
                        <td className="px-5 py-4 align-middle">
                          <div className="flex flex-wrap gap-2">
                            <ActionLink href={`/attendance/live?event=${row.id}`} label="View live attendance" icon={Eye} />
                            <ActionButton
                              label="Publish event"
                              icon={Send}
                              disabled={row.status === "published" || busyAction === `${row.id}-published`}
                              onClick={() => void updateStatus(row.id, "published")}
                            />
                            <ActionButton
                              label="Duplicate event"
                              icon={Copy}
                              disabled={busyAction === `${row.id}-duplicate`}
                              onClick={() => void duplicate(row)}
                            />
                            <ActionLink href={`/events/${row.id}/edit`} label="Edit event" icon={Pencil} />
                            <ActionButton label="Export CSV" icon={FileDown} onClick={() => exportEvent(row)} />
                            <ActionButton
                              label="Cancel event"
                              icon={XCircle}
                              disabled={row.status === "cancelled" || busyAction === `${row.id}-cancelled`}
                              onClick={() => void updateStatus(row.id, "cancelled")}
                            />
                            <ActionButton
                              label="Delete event"
                              icon={Trash2}
                              danger
                              disabled={busyAction === `${row.id}-delete`}
                              onClick={() => setDeleteEventId(row.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {safePageIndex * pageSize + 1}-{Math.min((safePageIndex + 1) * pageSize, sortedRows.length)} of {sortedRows.length} events
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="rounded-xl border-slate-200" onClick={() => setPageIndex((value) => Math.max(0, value - 1))} disabled={safePageIndex === 0}>
                  Previous
                </Button>
                <span className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                  Page {safePageIndex + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="rounded-xl border-slate-200"
                  onClick={() => setPageIndex((value) => Math.min(totalPages - 1, value + 1))}
                  disabled={safePageIndex >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
        )}
      </section>
      <ConfirmDialog open={Boolean(deleteEventId)} title="Delete this event?" description="The event will be removed from active lists. Existing attendance and audit records remain available to administrators." confirmLabel="Delete event" destructive busy={Boolean(deleteEventId && busyAction === `${deleteEventId}-delete`)} onCancel={() => setDeleteEventId(null)} onConfirm={() => { if (!deleteEventId) return; const id = deleteEventId; void softDelete(id).finally(() => setDeleteEventId(null)); }} />
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "slate" | "teal" | "amber" | "red" }) {
  const toneClass = {
    slate: "bg-slate-100 text-slate-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700"
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", toneClass)}>
          <CheckCircle2 size={17} />
        </span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === activeSortKey;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="px-5 py-3">
      <button
        type="button"
        className={cn("inline-flex items-center gap-1.5 font-black transition hover:text-slate-900", active && "text-brand-700")}
        onClick={() => onSort(sortKey)}
      >
        {label}
        <Icon size={13} />
      </button>
    </th>
  );
}

function ActionLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-100"
    >
      <Icon size={15} />
      <span className="hidden text-xs font-bold 2xl:inline">{label.replace(" event", "")}</span>
    </Link>
  );
}

function ActionButton({
  label,
  icon: Icon,
  danger,
  disabled,
  onClick
}: {
  label: string;
  icon: LucideIcon;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 transition focus:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-45",
        danger
          ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800 focus:ring-brand-100"
      )}
    >
      <Icon size={15} />
      <span className="hidden text-xs font-bold 2xl:inline">{label.replace(" event", "")}</span>
    </button>
  );
}

function EmptyState({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center border-t border-slate-200 px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <CalendarDays size={26} />
      </div>
      <h3 className="mt-4 text-lg font-black text-slate-950">{hasFilters ? "No events match your filters" : "No events yet"}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        {hasFilters ? "Try adjusting search, status, or date filters." : "Create your first event to start publishing attendance sessions."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasFilters ? (
          <Button variant="outline" className="rounded-xl" onClick={onClearFilters}>
            Reset filters
          </Button>
        ) : null}
        <Button asChild className="rounded-xl">
          <Link href="/events/new">Create Event</Link>
        </Button>
      </div>
    </div>
  );
}

function eventDate(row: EventRow) {
  return row.schedule?.event_date ?? "";
}

function eventVenue(row: EventRow) {
  return row.location?.venue_name ?? "";
}

function sortValue(row: EventRow, key: SortKey) {
  if (key === "date") return eventDate(row);
  if (key === "venue") return eventVenue(row);
  return String(row[key] ?? "");
}

function eventStats(row: EventRow) {
  const attendance = row.attendance ?? [];

  return {
    present: attendance.filter((item: { status: string }) => ["verified", "completed", "time_in_recorded"].includes(item.status)).length,
    late: attendance.filter((item: { status: string }) => item.status === "late").length,
    absent: attendance.filter((item: { status: string }) => item.status === "missed").length
  };
}
