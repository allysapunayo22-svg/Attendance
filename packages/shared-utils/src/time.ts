export function combineDateAndTime(date: string, time: string) {
  return new Date(`${date}T${time}`);
}

export function isNowWithinWindow(now: Date, startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return now >= start && now <= end;
}

export function minutesBetween(start: string | Date, end: string | Date) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function formatDurationMinutes(minutes: number | null | undefined) {
  if (minutes == null) return "Not recorded";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  return `${hours}h ${remainder}m`;
}
