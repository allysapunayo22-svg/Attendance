import type { Event } from "@attendance/types";

export function formatDate(value?: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options
  });
}

export function formatTime(value?: string | null) {
  if (!value) return "Pending";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Pending";
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Pending";
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function formatEventSchedule(event: Event) {
  if (!event.schedule) return "Schedule pending";
  return `${formatDate(event.schedule.starts_at, { weekday: "short" })} · ${formatTimeRange(event.schedule.starts_at, event.schedule.ends_at)}`;
}

export function formatShortDate(value?: string | null) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function clampPercentage(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function formatRelativeStatusDate(value?: string | null) {
  if (!value) return "Pending";
  const now = Date.now();
  const target = new Date(value).getTime();
  const minutes = Math.round((target - now) / 60000);
  const absolute = formatDateTime(value);

  if (Math.abs(minutes) < 1) return "Now";
  if (minutes > 0 && minutes < 60) return `In ${minutes} min`;
  if (minutes < 0 && minutes > -60) return `${Math.abs(minutes)} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours > 0 && hours < 24) return `In ${hours} hr`;
  if (hours < 0 && hours > -24) return `${Math.abs(hours)} hr ago`;

  return absolute;
}
