import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  published: "border-blue-200 bg-blue-50 text-blue-700 font-semibold",
  ongoing: "border-blue-200 bg-blue-50 text-blue-800 font-bold",
  completed: "border-slate-200 bg-slate-100 text-slate-700 font-medium",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700 font-medium",
  draft: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold",
  late: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
  rejected: "border-rose-200 bg-rose-50 text-rose-700 font-semibold",
  pending_verification: "border-amber-200 bg-amber-50 text-amber-800 font-medium",
  requires_review: "border-amber-300 bg-amber-50 text-amber-900 font-bold",
  excused: "border-blue-200 bg-blue-50 text-blue-700 font-medium",
  brand: "border-brand-200 bg-brand-50 text-brand-700 font-semibold",
  normal: "border-slate-200 bg-slate-100 text-slate-700 font-medium",
  important: "border-blue-200 bg-blue-50 text-blue-800 font-semibold",
  urgent: "border-rose-200 bg-rose-50 text-rose-700 font-bold"
};

export function Badge({ children, tone, className }: { children: React.ReactNode; tone?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors", toneMap[tone ?? ""] ?? "border-slate-200 bg-slate-100 text-slate-700", className)}>
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
