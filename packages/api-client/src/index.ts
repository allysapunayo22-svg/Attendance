import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AttendanceSubmission, Event, EventZone, VerificationResult } from "@attendance/types";

export function createAttendanceSupabaseClient(url: string, anonKey: string) {
  return createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });
}

export async function fetchAssignedEvents(client: SupabaseClient) {
  const { data, error } = await client
    .from("events")
    .select(
      `
      *,
      schedule:event_schedules(*),
      location:event_locations(*),
      zones:event_zones(*)
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(normalizeEventRow);
}

function firstOrValue<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function normalizeZone(row: Record<string, any>, fallback: { latitude: number; longitude: number } | null): EventZone {
  const geojson = row.geojson ?? {};
  const coordinates =
    Array.isArray(geojson.coordinates) && geojson.coordinates[0]?.latitude !== undefined
      ? geojson.coordinates
      : Array.isArray(geojson.coordinates?.[0])
        ? geojson.coordinates[0].map(([longitude, latitude]: [number, number]) => ({ latitude, longitude }))
        : row.zone_type === "circle"
          ? [
              {
                latitude: row.center_latitude ?? fallback?.latitude ?? 0,
                longitude: row.center_longitude ?? fallback?.longitude ?? 0
              }
            ]
          : [];

  return {
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    zone_type: row.zone_type,
    radius_meters: row.radius_meters,
    coordinates
  };
}

function normalizeEventRow(row: Record<string, any>): Event {
  const schedule = firstOrValue(row.schedule);
  const location = firstOrValue(row.location);
  const fallback = location ? { latitude: location.latitude, longitude: location.longitude } : null;

  return {
    ...row,
    schedule,
    location,
    zones: Array.isArray(row.zones) ? row.zones.map((zone: Record<string, any>) => normalizeZone(zone, fallback)) : []
  } as Event;
}

export async function submitAttendance(
  client: SupabaseClient,
  submission: AttendanceSubmission,
  accessToken?: string
): Promise<VerificationResult> {
  const { data, error } = await client.functions.invoke("submit-attendance", {
    body: submission,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {})
  });

  if (error) {
    let message = error.message;
    const context = (error as { context?: { clone?: () => { json?: () => Promise<unknown> }; json?: () => Promise<unknown> } }).context;

    try {
      const reader = context?.clone?.() ?? context;
      const responseBody = await reader?.json?.();
      if (responseBody && typeof responseBody === "object") {
        const body = responseBody as { error?: unknown; message?: unknown };
        if (typeof body.error === "string") message = body.error;
        else if (typeof body.message === "string") message = body.message;
      }
    } catch {
      // Keep the client error when the function response has no JSON body.
    }

    throw new Error(message);
  }
  return data as VerificationResult;
}

export async function uploadAttendancePhoto(
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: Blob | ArrayBuffer | Uint8Array,
  contentType: string
) {
  const { data, error } = await client.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false
  });

  if (error) throw error;
  return data;
}
