import type { AttendanceSubmission, LocalSyncStatus } from "@attendance/types";
import { db } from "../database/client";

export interface LocalAttendanceRecord extends AttendanceSubmission {
  status: string;
  sync_status: LocalSyncStatus;
  distance_meters?: number | null;
  photo_local_uri?: string;
  photo_storage_path?: string;
  retry_count: number;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export async function saveLocalAttendance(record: LocalAttendanceRecord) {
  await db.runAsync(
    `insert into attendance_sessions (
      local_id,
      event_id,
      mode,
      status,
      sync_status,
      device_timestamp,
      latitude,
      longitude,
      accuracy_meters,
      distance_meters,
      photo_local_uri,
      photo_storage_path,
      photo_hash,
      qr_token,
      device_id,
      is_offline_submission,
      idempotency_key,
      retry_count,
      last_error,
      created_at,
      updated_at
    )
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(local_id) do update set
      status = excluded.status,
      sync_status = excluded.sync_status,
      photo_storage_path = excluded.photo_storage_path,
      retry_count = excluded.retry_count,
      last_error = excluded.last_error,
      updated_at = excluded.updated_at`,
    record.local_id,
    record.event_id,
    record.mode,
    record.status,
    record.sync_status,
    record.device_timestamp,
    record.latitude,
    record.longitude,
    record.accuracy_meters,
    record.distance_meters ?? null,
    record.photo_local_uri ?? null,
    record.photo_storage_path ?? null,
    record.photo_hash ?? null,
    record.qr_token ?? null,
    record.device_id,
    record.is_offline_submission ? 1 : 0,
    record.idempotency_key,
    record.retry_count,
    record.last_error ?? null,
    record.created_at,
    record.updated_at
  );
}

export async function getPendingAttendanceRecords() {
  const rows = await db.getAllAsync<{
    local_id: string;
    event_id: string;
    mode: "time_in" | "time_out";
    device_timestamp: string;
    latitude: number;
    longitude: number;
    accuracy_meters: number;
    photo_local_uri: string | null;
    photo_storage_path: string | null;
    photo_hash: string | null;
    qr_token: string | null;
    idempotency_key: string;
    device_id: string;
    is_offline_submission: number;
    retry_count: number;
  }>(
    `select * from attendance_sessions
     where sync_status in ('pending_upload', 'failed')
     order by created_at asc
     limit 20`
  );

  return rows;
}

export async function updateAttendanceSyncState(
  localId: string,
  syncStatus: LocalSyncStatus,
  options: {
    status?: string | undefined;
    photoStoragePath?: string | null | undefined;
    serverPayload?: unknown;
    lastError?: string | null | undefined;
    retryCount?: number | undefined;
  } = {}
) {
  await db.runAsync(
    `update attendance_sessions
     set sync_status = ?,
         status = coalesce(?, status),
         photo_storage_path = coalesce(?, photo_storage_path),
         server_payload = coalesce(?, server_payload),
         last_error = ?,
         retry_count = coalesce(?, retry_count),
         updated_at = ?
     where local_id = ?`,
    syncStatus,
    options.status ?? null,
    options.photoStoragePath ?? null,
    options.serverPayload ? JSON.stringify(options.serverPayload) : null,
    options.lastError ?? null,
    options.retryCount ?? null,
    new Date().toISOString(),
    localId
  );
}

export async function getAttendanceHistory() {
  return db.getAllAsync<{
    local_id: string;
    event_id: string;
    mode: string;
    status: string;
    sync_status: string;
    device_timestamp: string;
    distance_meters: number | null;
    server_payload: string | null;
  }>("select * from attendance_sessions order by created_at desc");
}

export async function getAttendanceByLocalId(localId: string) {
  return db.getFirstAsync<{
    local_id: string;
    event_id: string;
    mode: string;
    status: string;
    sync_status: string;
    device_timestamp: string;
    latitude: number | null;
    longitude: number | null;
    accuracy_meters: number | null;
    distance_meters: number | null;
    photo_local_uri: string | null;
    photo_storage_path: string | null;
    photo_hash: string | null;
    server_payload: string | null;
    retry_count: number;
    last_error: string | null;
  }>("select * from attendance_sessions where local_id = ?", localId);
}

export async function getLatestAttendanceForEvent(eventId: string, mode?: "time_in" | "time_out") {
  return db.getFirstAsync<{
    local_id: string;
    event_id: string;
    mode: "time_in" | "time_out";
    status: string;
    sync_status: string;
    device_timestamp: string;
    distance_meters: number | null;
    server_payload: string | null;
  }>(
    `select local_id, event_id, mode, status, sync_status, device_timestamp, distance_meters, server_payload
     from attendance_sessions
     where event_id = ?
       and (? is null or mode = ?)
     order by created_at desc
     limit 1`,
    eventId,
    mode ?? null,
    mode ?? null
  );
}
