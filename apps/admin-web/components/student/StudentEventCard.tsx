import Link from "next/link";
import type { Event } from "@attendance/types";
import { ArrowRight, CalendarDays, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { formatDate, formatTimeRange, getEventPhase } from "@/lib/student/format";
import { StudentStatusBadge } from "./StudentStatusBadge";

export function StudentEventCard({ event, compact = false }: { event: Event; compact?: boolean }) {
  const phase = getEventPhase(event);
  const startsAt = event.schedule?.starts_at ? new Date(event.schedule.starts_at) : null;
  const day = startsAt ? startsAt.getDate() : "—";
  const month = startsAt ? new Intl.DateTimeFormat(undefined, { month: "short" }).format(startsAt) : "TBD";

  return (
    <Link href={`/student/events/${event.id}`} className={`group block overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-student-200 hover:shadow-md ${compact ? "p-3" : "p-4"}`}>
      <div className="flex gap-4">
        <div className="relative flex w-[78px] shrink-0 flex-col items-center justify-center overflow-hidden rounded-2xl bg-student-100 px-2 py-4 text-student-800">
          <CalendarDays size={17} className="absolute left-3 top-3 text-student-700/70" />
          <span className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.15em] text-student-700">{month}</span>
          <span className="text-3xl font-black leading-none">{day}</span>
          <span className="mt-2 rounded-full bg-white/15 px-2 py-1 text-[9px] font-bold uppercase">{event.type}</span>
        </div>
        <div className="min-w-0 flex-1 py-1">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-student-700">{event.requirement === "required" ? "Required event" : "Optional event"}</p><h2 className="mt-1 line-clamp-2 text-base font-black leading-5 text-slate-950 sm:text-lg">{event.title}</h2></div><StudentStatusBadge value={phase} /></div>
          <div className="mt-3 space-y-2 text-xs font-medium text-slate-600">
            <p className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-student-50 text-student-700"><Clock3 size={14} /></span><span className="truncate">{formatDate(event.schedule?.starts_at, { weekday: "short" })} · {formatTimeRange(event.schedule?.starts_at, event.schedule?.ends_at)}</span></p>
            <p className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-student-50 text-student-700"><MapPin size={14} /></span><span className="truncate">{event.location?.venue_name ?? "Venue pending"}</span></p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3"><span className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-[10px] font-bold text-slate-600"><ShieldCheck size={13} className="text-student-700" /> {event.dynamic_qr_required ? "QR required" : "Standard verification"}</span><span className="flex items-center gap-1 text-xs font-extrabold text-student-700">Details <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></span></div>
    </Link>
  );
}
