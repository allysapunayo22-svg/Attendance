"use client";

import Link from "next/link";
import { use } from "react";
import { formatDistance } from "@attendance/shared-utils";
import { ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, MapPin, ShieldAlert } from "lucide-react";
import { StudentError, StudentLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentAttendanceDetail } from "@/components/student/hooks";
import { formatDateTime, labelize } from "@/lib/student/format";

export default function StudentAttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useStudentAttendanceDetail(id);
  if (query.isLoading) return <StudentLoading label="Loading attendance record" />;
  if (query.isError) return <StudentError message="This attendance record could not be loaded." retry={() => void query.refetch()} />;
  const record = query.data;
  if (!record) return <NotFound />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/student/attendance" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200"><ArrowLeft size={17} /> Attendance history</Link>
      <header className="rounded-3xl border border-student-200 bg-student-50 p-6 text-slate-800 shadow-sm sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-student-700">Server attendance record</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">{record.event?.title ?? "Campus event"}</h1><p className="mt-2 text-sm text-slate-600">Created {formatDateTime(record.created_at)}</p></div><StudentStatusBadge value={record.status} /></div></header>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-extrabold text-slate-950">Attendance timeline</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><TimelineCard icon={CheckCircle2} label="Time in" deviceTime={record.time_in_device_timestamp} serverTime={record.time_in_server_timestamp} verifiedTime={record.time_in_verified_timestamp} /><TimelineCard icon={Clock3} label="Time out" deviceTime={record.time_out_device_timestamp} serverTime={record.time_out_server_timestamp} verifiedTime={record.time_out_verified_timestamp} /></div>{record.attendance_duration_minutes != null ? <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">Recorded duration: <strong>{record.attendance_duration_minutes} minutes</strong></p> : null}</section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-extrabold text-slate-950">Location evidence</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><Evidence label="Time-in distance" value={formatDistance(record.time_in_distance)} /><Evidence label="Time-in accuracy" value={record.time_in_accuracy == null ? "Unavailable" : `${Math.round(record.time_in_accuracy)} m`} /><Evidence label="Time-out distance" value={formatDistance(record.time_out_distance)} /><Evidence label="Time-out accuracy" value={record.time_out_accuracy == null ? "Unavailable" : `${Math.round(record.time_out_accuracy)} m`} /></div>{record.event?.location ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><MapPin size={16} className="text-student-700" /> {record.event.location.venue_name}</p> : null}</section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-extrabold text-slate-950">Verification</h2><StudentStatusBadge value={record.sync_status} /></div><dl className="mt-4 divide-y divide-slate-100"><Info label="Decision" value={labelize(record.status)} /><Info label="Reason" value={record.verification_reason ?? "No additional verification note."} /><Info label="Submission" value={record.is_offline_submission ? "Uploaded after offline capture" : "Submitted online"} /><Info label="Review" value={record.reviewed_at ? `Reviewed ${formatDateTime(record.reviewed_at)}` : "No manual review recorded"} /></dl>{record.suspicious_flags.length ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-amber-900"><ShieldAlert size={17} /> Review flags</p><p className="mt-2 text-sm text-amber-800">{record.suspicious_flags.map(labelize).join(", ")}</p></div> : null}</section>
    </div>
  );
}

function TimelineCard({ icon: Icon, label, deviceTime, serverTime, verifiedTime }: { icon: typeof CheckCircle2; label: string; deviceTime: string | null; serverTime: string | null; verifiedTime: string | null }) {
  const primary = serverTime ?? deviceTime;
  return <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-student-100 text-student-700"><Icon size={18} /></span><p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-900">{primary ? formatDateTime(primary) : "Not recorded"}</p>{verifiedTime ? <p className="mt-2 text-xs text-emerald-700">Verified {formatDateTime(verifiedTime)}</p> : null}</div>;
}

function Evidence({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-900">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="grid gap-1 py-3 sm:grid-cols-[150px_1fr]"><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="text-sm text-slate-800">{value}</dd></div>;
}

function NotFound() {
  return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CalendarCheck2 className="mx-auto text-slate-400" size={32} /><h1 className="mt-4 text-xl font-black">Attendance record unavailable</h1><p className="mt-2 text-sm leading-6 text-slate-500">The record does not exist or does not belong to your student account.</p><Link href="/student/attendance" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-student-800 px-5 text-sm font-bold text-white">Back to history</Link></div>;
}
