import type { LucideIcon } from "lucide-react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { StudentPageHeader } from "./StudentPageHeader";

export function StudentLoading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-56 items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm">
      <div><LoaderCircle className="mx-auto animate-spin text-student-700" size={28} /><p className="mt-3 text-sm font-medium text-slate-600">{label}</p></div>
    </div>
  );
}

export function StudentPageLoading({ title, description = "Loading the latest information" }: { title: string; description?: string }) {
  return (
    <div className="space-y-5" role="status" aria-label={`Loading ${title}`}>
      <StudentPageHeader title={title} description={description} />
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="h-12 animate-pulse rounded-full bg-slate-100" />
        <div className="flex gap-2"><div className="h-10 w-20 animate-pulse rounded-full bg-slate-100" /><div className="h-10 w-24 animate-pulse rounded-full bg-slate-100" /><div className="h-10 w-20 animate-pulse rounded-full bg-slate-100" /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-3xl border border-slate-200/70 bg-white shadow-sm" />)}
      </div>
      <span className="sr-only">{description}</span>
    </div>
  );
}

export function StudentDashboardLoading() {
  return (
    <div className="space-y-4 px-4 pt-4 sm:px-6 lg:px-0 lg:pt-0" role="status" aria-label="Loading student dashboard">
      <div className="h-32 animate-pulse rounded-3xl border border-student-200 bg-student-100" />
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="h-56 animate-pulse rounded-3xl border border-student-200 bg-white shadow-sm lg:col-span-7" />
        <div className="h-56 animate-pulse rounded-3xl border border-student-200 bg-white shadow-sm lg:col-span-5" />
      </div>
      <div className="grid grid-cols-2 gap-3"><div className="h-[76px] animate-pulse rounded-2xl bg-student-100" /><div className="h-[76px] animate-pulse rounded-2xl bg-white" /></div>
      <span className="sr-only">Loading your student dashboard</span>
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
