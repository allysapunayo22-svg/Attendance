import type { AttendanceStatus, Event } from "@attendance/types";

export type EventPhase = "upcoming" | "ongoing" | "completed" | "cancelled" | "pending";

export function getEventPhase(event: Event, now = Date.now()): EventPhase {
  if (event.status === "cancelled") return "cancelled";
  if (!event.schedule) return "pending";

  const starts = new Date(event.schedule.starts_at).getTime();
  const ends = new Date(event.schedule.ends_at).getTime();

  if (now < starts) return "upcoming";
  if (now <= ends) return "ongoing";
  return "completed";
}

export function getEventAttendanceStatus(event: Event, now = Date.now()): AttendanceStatus | string {
  if (event.attendance_status) return event.attendance_status;
  const phase = getEventPhase(event, now);
  if (phase === "ongoing") return "eligible_to_check_in";
  if (phase === "completed") return "missed";
  return event.status;
}

export function getPrimaryActionLabel(event: Event, now = Date.now()) {
  const phase = getEventPhase(event, now);
  if (phase === "ongoing") return "Time In";
  if (phase === "completed") return "View Details";
  return "View Event";
}

export function getEventSortTime(event: Event) {
  return event.schedule ? new Date(event.schedule.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
}

export function makeEventMap(events: Event[]) {
  return new Map(events.map((event) => [event.id, event]));
}

export function isAttendanceCounted(status?: string | null) {
  return ["verified", "completed", "time_in_recorded", "late", "pending_verification"].includes(status ?? "");
}

export function needsAttention(status?: string | null) {
  return ["failed", "requires_review", "rejected", "outside_attendance_area", "gps_accuracy_too_low"].includes(status ?? "");
}
