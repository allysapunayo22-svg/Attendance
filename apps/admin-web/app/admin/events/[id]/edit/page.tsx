import { EventEditForm } from "@/components/events/EventEditForm";

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Edit Event</h1>
        <p className="mt-1 text-sm text-slate-500">Update event details, schedules, location, attendance radius, and verification requirements.</p>
      </div>
      <EventEditForm eventId={id} />
    </div>
  );
}
