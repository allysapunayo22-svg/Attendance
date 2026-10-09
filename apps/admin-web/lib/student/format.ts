import type { AttendanceStatus, Event } from "@attendance/types";

export type EventPhase = "upcoming" | "ongoing" | "completed" | "cancelled" | "pending";

export function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options
  }).format(new Date(value));
}

export function formatTime(value?: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Pending";
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Pending";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatEventSchedule(event: Event) {
  if (!event.schedule) return "Schedule pending";
  return `${formatDate(event.schedule.starts_at, { weekday: "short" })} · ${formatTimeRange(event.schedule.starts_at, event.schedule.ends_at)}`;
}

export function getEventPhase(event: Event, now = Date.now()): EventPhase {
  if (event.status === "cancelled") return "cancelled";
  if (!event.schedule) return "pending";
  const starts = new Date(event.schedule.starts_at).getTime();
  const ends = new Date(event.schedule.ends_at).getTime();
  if (now < starts) return "upcoming";
  if (now <= ends) return "ongoing";
  return "completed";
}

export function getEventSortTime(event: Event) {
  return event.schedule ? new Date(event.schedule.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
}

export function labelize(value?: string | null) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function isResolvedAttendance(status: AttendanceStatus) {
  return ["verified", "completed", "time_in_recorded", "late", "excused"].includes(status);
}

export function attendanceNeedsReview(status: AttendanceStatus) {
  return ["pending_verification", "rejected", "outside_attendance_area", "gps_accuracy_too_low"].includes(status);
}

export function initials(value?: string | null, fallback = "ST") {
  if (!value) return fallback;
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || fallback;
}

export function notificationDestination(metadata: Record<string, unknown>) {
  const attendanceId = [metadata.attendance_id, metadata.attendance_session_id].find((value) => typeof value === "string");
  if (typeof attendanceId === "string") return `/student/attendance/${encodeURIComponent(attendanceId)}`;
  if (typeof metadata.event_id === "string") return `/student/events/${encodeURIComponent(metadata.event_id)}`;
  return null;
}
