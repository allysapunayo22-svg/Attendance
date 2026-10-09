import { EventForm } from "@/components/events/EventForm";

export default function NewEventPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Create Event</h1>
        <p className="mt-1 text-sm text-slate-500">Configure schedule, attendance zone, verification rules, assignments, and notifications.</p>
      </div>
      <EventForm />
    </div>
  );
}
