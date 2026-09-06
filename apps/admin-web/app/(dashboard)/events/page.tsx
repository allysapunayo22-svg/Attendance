import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsTable } from "@/components/events/EventsTable";

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 sm:flex">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Management</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Create, publish, cancel, duplicate, delete, and export event attendance from one organized workspace.
              </p>
            </div>
          </div>
          <Button asChild className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 px-4 text-xs font-semibold text-white shadow-xs transition active:scale-[0.98]">
            <Link href="/events/new">
              <Plus size={15} />
              <span>Create Event</span>
            </Link>
          </Button>
        </div>
      </section>

      <EventsTable />
    </div>
  );
}
