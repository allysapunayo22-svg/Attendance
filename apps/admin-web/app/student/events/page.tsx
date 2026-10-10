"use client";

import { useMemo, useState } from "react";
import { CalendarX2, Search } from "lucide-react";
import { StudentEventCard } from "@/components/student/StudentEventCard";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { StudentRefreshButton } from "@/components/student/StudentRefreshButton";
import { StudentEmpty, StudentError, StudentPageLoading } from "@/components/student/StudentStates";
import { useStudentEvents } from "@/components/student/hooks";
import { getEventPhase, getEventSortTime } from "@/lib/student/format";

const filters = ["all", "upcoming", "ongoing", "completed", "cancelled"] as const;
type EventFilter = (typeof filters)[number];

export default function StudentEventsPage() {
  const query = useStudentEvents();
  const [filter, setFilter] = useState<EventFilter>("all");
  const [search, setSearch] = useState("");
  const events = useMemo(() => query.data ?? [], [query.data]);
  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    return events
      .filter((event) => filter === "all" || getEventPhase(event) === filter)
      .filter((event) => !value || `${event.title} ${event.description} ${event.location?.venue_name ?? ""}`.toLowerCase().includes(value))
      .sort((a, b) => {
        const first = getEventSortTime(a);
        const second = getEventSortTime(b);
        return filter === "completed" ? second - first : first - second;
      });
  }, [events, filter, search]);

  if (query.isLoading) return <StudentPageLoading title="Events" description="Loading your assigned events" />;
  if (query.isError) return <StudentError message="Your assigned events could not be loaded." retry={() => void query.refetch()} />;

  return (
    <div className="space-y-5">
      <StudentPageHeader title="Events" description={`${events.length} event${events.length === 1 ? "" : "s"} available to your account`} action={<StudentRefreshButton refreshing={query.isFetching} onRefresh={() => void query.refetch()} />} />
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm"><label className="relative block"><span className="sr-only">Search events</span><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events or venues" className="min-h-12 w-full rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-student-500 focus:bg-white focus:ring-4 focus:ring-student-100" /></label><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filter events">{filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-bold capitalize ${filter === item ? "bg-student-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}</div></div>
      {filtered.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((event) => <StudentEventCard key={event.id} event={event} />)}</div> : <StudentEmpty icon={CalendarX2} title="No matching events" description={search || filter !== "all" ? "Try another search or event filter." : "Assigned and unrestricted student events will appear here."} />}
    </div>
  );
}
