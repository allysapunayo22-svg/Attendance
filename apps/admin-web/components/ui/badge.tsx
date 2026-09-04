import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  published: "border-blue-200 bg-blue-50 text-blue-700",
  ongoing: "border-emerald-200 bg-emerald-50 text-emerald-700 font-extrabold",
  completed: "border-slate-200 bg-slate-100 text-slate-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
  draft: "border-amber-200 bg-amber-50 text-amber-700",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700 font-bold",
  late: "border-orange-200 bg-orange-50 text-orange-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  pending_verification: "border-amber-200 bg-amber-50 text-amber-800",
  requires_review: "border-amber-300 bg-amber-50 text-amber-900 font-bold",
  excused: "border-indigo-200 bg-indigo-50 text-indigo-700"
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
