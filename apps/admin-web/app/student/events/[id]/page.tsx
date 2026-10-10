"use client";

import Link from "next/link";
import { use } from "react";
import { ArrowLeft, CalendarDays, Camera, Clock3, MapPin, QrCode, ShieldCheck } from "lucide-react";
import { AttendanceActionBoundary } from "@/components/student/AttendanceActionBoundary";
import { StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAttendance, useStudentEvent } from "@/components/student/hooks";
import { formatDate, formatTimeRange, getEventPhase } from "@/lib/student/format";

export default function StudentEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventQuery = useStudentEvent(id);
  const attendanceQuery = useStudentAttendance();

  if (eventQuery.isLoading || attendanceQuery.isLoading) return <StudentLoading label="Loading authoritative attendance details" />;
  if (eventQuery.isError) return <StudentError message="This event could not be loaded." retry={() => void eventQuery.refetch()} />;
  if (attendanceQuery.isError) return <StudentError message="Your attendance state could not be loaded." retry={() => void attendanceQuery.refetch()} />;
  const event = eventQuery.data;
  if (!event) return <NotFound />;

  const attendance = attendanceQuery.data?.find((row) => row.event_id === event.id) ?? null;
  const phase = getEventPhase(event);
  const mapsUrl = event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location.latitude},${event.location.longitude}`)}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/student/events" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft size={17} /> Back to events</Link>

      <header className="overflow-hidden rounded-3xl border border-student-200 bg-student-50 p-6 text-slate-800 shadow-sm sm:p-8"><div className="flex flex-wrap items-center gap-2"><StudentStatusBadge value={phase} /><span className="rounded-full bg-student-100 px-3 py-1 text-xs font-bold ring-1 ring-white/20">{event.requirement === "required" ? "Required" : "Optional"}</span></div><h1 className="mt-4 text-2xl font-black tracking-tight sm:text-4xl">{event.title}</h1><p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-7 text-slate-600">{event.description}</p></header>

      <div className="grid gap-5 lg:grid-cols-2">
        <DetailSection title="Schedule"><DetailRow icon={CalendarDays} label="Date" value={formatDate(event.schedule?.starts_at, { weekday: "long" })} /><DetailRow icon={Clock3} label="Event time" value={formatTimeRange(event.schedule?.starts_at, event.schedule?.ends_at)} /><DetailRow icon={Clock3} label="Check-in window" value={formatTimeRange(event.schedule?.check_in_opens_at, event.schedule?.check_in_closes_at)} /><DetailRow icon={Clock3} label="Check-out window" value={formatTimeRange(event.schedule?.check_out_opens_at, event.schedule?.check_out_closes_at)} /></DetailSection>
        <DetailSection title="Location"><DetailRow icon={MapPin} label="Venue" value={event.location?.venue_name ?? "Venue pending"} /><DetailRow icon={MapPin} label="Address" value={event.location?.address ?? "No address provided"} />{event.location ? <p className="mt-2 text-sm text-slate-500">Attendance radius: {event.location.radius_meters} m</p> : null}{mapsUrl ? <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-student-50 px-4 text-sm font-bold text-student-800 hover:bg-student-100">Open map</a> : null}</DetailSection>
      </div>

      <DetailSection title="Verification requirements"><div className="grid gap-3 sm:grid-cols-3"><Requirement icon={Camera} label="Time-in photo" required={event.photo_required} /><Requirement icon={Camera} label="Time-out photo" required={event.time_out_photo_required} /><Requirement icon={QrCode} label="Dynamic QR" required={event.dynamic_qr_required} /></div>{event.minimum_attendance_minutes > 0 ? <p className="mt-4 text-sm text-slate-600">Minimum attendance duration: <strong>{event.minimum_attendance_minutes} minutes</strong></p> : null}</DetailSection>

      {event.zones?.length ? <DetailSection title="Attendance zones"><div className="grid gap-3 sm:grid-cols-2">{event.zones.map((zone) => <div key={zone.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex items-center gap-2"><ShieldCheck size={17} className="text-student-700" /><p className="font-bold text-slate-900">{zone.name}</p></div><p className="mt-2 text-xs text-slate-500">{zone.zone_type === "circle" ? `Circular zone · ${zone.radius_meters ?? event.location?.radius_meters ?? "—"} m radius` : "Polygon attendance boundary"}</p></div>)}</div></DetailSection> : null}

      {attendance ? <Link href={`/student/attendance/${attendance.id}`} className="flex items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div><p className="text-sm font-bold text-emerald-900">Attendance record available</p><p className="mt-1 text-xs text-emerald-700">Open the authoritative server record for this event.</p></div><StudentStatusBadge value={attendance.status} /></Link> : null}
      <AttendanceActionBoundary event={event} attendance={attendance} />
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-base font-extrabold text-slate-950">{title}</h2><div className="mt-4 space-y-3">{children}</div></section>;
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-student-50 text-student-700"><Icon size={17} /></span><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p></div></div>;
}

function Requirement({ icon: Icon, label, required }: { icon: typeof Camera; label: string; required: boolean }) {
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><Icon size={19} className="text-student-700" /><p className="mt-3 text-sm font-bold text-slate-900">{label}</p><p className="mt-1 text-xs text-slate-500">{required ? "Required" : "Not required"}</p></div>;
}

function NotFound() {
  return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CalendarDays className="mx-auto text-slate-400" size={32} /><h1 className="mt-4 text-xl font-black text-slate-950">Event unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">This event does not exist or is not available to your student account.</p><Link href="/student/events" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-student-800 px-5 text-sm font-bold text-white">Back to events</Link></div>;
}
