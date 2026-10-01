export function eventSaveErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }
  return "Unable to save this event. Please try again.";
}

// All schedule inputs refer to the selected event date in the admin's local timezone.
export function toEventTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

// Supabase REST writes are separate transactions. Remove only the draft created
// by this attempt if a dependent write fails, so retrying does not leave orphans.
export async function completeEventCreation(
  save: () => Promise<void>,
  rollback: () => Promise<void>
) {
  try {
    await save();
  } catch (error) {
    try {
      await rollback();
    } catch {
      throw new Error(`${eventSaveErrorMessage(error)} The incomplete draft could not be removed. Check the Events list before creating another event.`);
    }
    throw error;
  }
}
