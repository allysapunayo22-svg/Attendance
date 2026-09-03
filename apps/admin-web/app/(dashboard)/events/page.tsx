import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventsTable } from "@/components/events/EventsTable";

export default function EventsPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 sm:flex">
              <CalendarDays size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">Event Management</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Create, publish, cancel, duplicate, delete, and export event attendance from one organized workspace.
              </p>
            </div>
          </div>
          <Button asChild className="h-11 rounded-xl shadow-sm">
            <Link href="/events/new">
              <Plus size={16} />
              Create Event
            </Link>
          </Button>
        </div>
      </section>

      <EventsTable />
    </div>
  );
}
