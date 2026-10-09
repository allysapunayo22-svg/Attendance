import Link from "next/link";
import type { Event } from "@attendance/types";
import { ArrowRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { formatDate, formatTimeRange, getEventPhase } from "@/lib/student/format";
import { StudentStatusBadge } from "./StudentStatusBadge";

export function StudentEventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const phase = getEventPhase(event);
  return (
    <Link href={`/student/events/${event.id}`} className={`group block rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{event.requirement === "required" ? "Required event" : "Optional event"}</p><h2 className="mt-1 line-clamp-2 text-lg font-extrabold text-slate-950">{event.title}</h2></div><StudentStatusBadge value={phase} /></div>
      <div className="mt-4 grid gap-2 text-sm text-slate-600">
        <p className="flex items-center gap-2"><CalendarDays size={16} className="shrink-0 text-teal-700" /><span>{formatDate(event.schedule?.starts_at, { weekday: "short" })}</span></p>
        <p className="flex items-center gap-2"><Clock3 size={16} className="shrink-0 text-teal-700" /><span>{formatTimeRange(event.schedule?.starts_at, event.schedule?.ends_at)}</span></p>
        <p className="flex items-center gap-2"><MapPin size={16} className="shrink-0 text-teal-700" /><span className="truncate">{event.location?.venue_name ?? "Venue pending"}</span></p>
      </div>
      <span className="mt-4 flex items-center justify-end gap-1 text-sm font-bold text-teal-700">View details <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
    </Link>
  );
}
