import { labelize } from "@/lib/student/format";

const toneClasses: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700 ring-blue-200",
  published: "bg-blue-50 text-blue-700 ring-blue-200",
  ongoing: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  verified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  excused: "bg-teal-50 text-teal-700 ring-teal-200",
  time_in_recorded: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  late: "bg-amber-50 text-amber-700 ring-amber-200",
  important: "bg-amber-50 text-amber-700 ring-amber-200",
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  pending_verification: "bg-amber-50 text-amber-700 ring-amber-200",
  urgent: "bg-rose-50 text-rose-700 ring-rose-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  missed: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
  unread: "bg-blue-50 text-blue-700 ring-blue-200",
  read: "bg-slate-100 text-slate-600 ring-slate-200",
  normal: "bg-slate-100 text-slate-700 ring-slate-200"
};

export function StudentStatusBadge({ value }: { value?: string | null }) {
  const key = value ?? "pending";
  return (
    <span className={`inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ring-1 ring-inset ${toneClasses[key] ?? toneClasses.pending}`}>
      {labelize(key)}
    </span>
  );
}
