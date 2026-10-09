import type { ReactNode } from "react";

export function StudentPageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>{description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}</div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
