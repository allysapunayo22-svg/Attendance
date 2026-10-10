import type { LucideIcon } from "lucide-react";
import { AlertCircle, LoaderCircle } from "lucide-react";

export function StudentLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
      <div><LoaderCircle className="mx-auto animate-spin text-student-700" size={28} /><p className="mt-3 text-sm font-medium text-slate-600">{label}</p></div>
    </div>
  );
}

export function StudentError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
      <div className="flex items-start gap-3"><AlertCircle className="mt-0.5 shrink-0" size={20} /><div><p className="font-bold">Unable to load this page</p><p className="mt-1 text-sm leading-5 text-rose-700">{message}</p></div></div>
      <button type="button" onClick={retry} className="mt-4 min-h-11 rounded-full bg-rose-700 px-5 text-sm font-bold text-white hover:bg-rose-800">Try again</button>
    </div>
  );
}

export function StudentEmpty({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-student-50 text-student-700"><Icon size={24} /></span>
      <h2 className="mt-4 font-bold text-slate-950">{title}</h2><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
