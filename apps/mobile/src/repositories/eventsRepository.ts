import type { Announcement, Event } from "@attendance/types";
import { fetchAssignedEvents } from "@attendance/api-client";
import { db, setMetadata } from "../database/client";
import { supabase } from "../services/supabase";

export async function getCachedEvents() {
  const rows = await db.getAllAsync<{ payload: string }>("select payload from events order by starts_at asc");
  return rows.map((row) => JSON.parse(row.payload) as Event);
}

export async function cacheEvents(events: Event[]) {
  await db.withTransactionAsync(async () => {
    if (events.length) {
      const placeholders = events.map(() => "?").join(",");
      await db.runAsync(`delete from events where id not in (${placeholders})`, ...events.map((event) => event.id));
    } else {
      await db.runAsync("delete from events");
    }

    for (const event of events) {
      await db.runAsync(
        `insert into events (id, payload, status, starts_at, updated_at)
         values (?, ?, ?, ?, ?)
         on conflict(id) do update set payload = excluded.payload, status = excluded.status, starts_at = excluded.starts_at, updated_at = excluded.updated_at`,
        event.id,
        JSON.stringify(event),
        event.status,
        event.schedule?.starts_at ?? null,
        event.updated_at
      );
    }
  });
  await setMetadata("events:last_sync", new Date().toISOString());
}

export async function refreshEvents() {
  const events = await fetchAssignedEvents(supabase);
  await cacheEvents(events);
  return events;
}

export async function getCachedEvent(eventId: string) {
  const row = await db.getFirstAsync<{ payload: string }>("select payload from events where id = ?", eventId);
  return row ? (JSON.parse(row.payload) as Event) : null;
}

export async function getCachedAnnouncements() {
  const rows = await db.getAllAsync<{ payload: string }>("select payload from announcements order by publish_at desc");
  return rows.map((row) => JSON.parse(row.payload) as Announcement);
}

export async function refreshAnnouncements() {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("publish_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  const announcements = (data ?? []) as Announcement[];

  await db.withTransactionAsync(async () => {
    for (const announcement of announcements) {
      await db.runAsync(
        `insert into announcements (id, payload, publish_at)
         values (?, ?, ?)
         on conflict(id) do update set payload = excluded.payload, publish_at = excluded.publish_at`,
        announcement.id,
        JSON.stringify(announcement),
        announcement.publish_at
      );
    }
  });

  await setMetadata("announcements:last_sync", new Date().toISOString());
  return announcements;
}
