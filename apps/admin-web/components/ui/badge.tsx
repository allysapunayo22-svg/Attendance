import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  published: "border-teal-200 bg-teal-50 text-teal-800",
  ongoing: "border-emerald-200 bg-emerald-50 text-emerald-800",
  completed: "border-slate-300 bg-slate-100 text-slate-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
  draft: "border-amber-200 bg-amber-50 text-amber-800",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  late: "border-orange-200 bg-orange-50 text-orange-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  pending_verification: "border-amber-200 bg-amber-50 text-amber-800",
  requires_review: "border-amber-200 bg-amber-50 text-amber-800",
  excused: "border-indigo-200 bg-indigo-50 text-indigo-800"
};

export function Badge({ children, tone, className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-bold", toneMap[tone ?? ""] ?? "border-slate-200 bg-slate-100 text-slate-700", className)}>
      {children}
    </span>
  );
}

export function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
