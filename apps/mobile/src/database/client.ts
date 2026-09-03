import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabaseSync("attendance.db");

export async function initDatabase() {
  await db.execAsync(`
    pragma journal_mode = WAL;
    create table if not exists metadata (
      key text primary key not null,
      value text not null
    );
    create table if not exists student_profile (
      id text primary key not null,
      user_id text not null,
      student_id text not null,
      full_name text not null,
      email text not null,
      course_id text,
      section_id text,
      year_level integer,
      profile_photo_path text,
      is_active integer not null
    );
    create table if not exists events (
      id text primary key not null,
      payload text not null,
      status text not null,
      starts_at text,
      updated_at text not null
    );
    create table if not exists announcements (
      id text primary key not null,
      payload text not null,
      publish_at text not null
    );
    create table if not exists attendance_sessions (
      local_id text primary key not null,
      remote_id text,
      event_id text not null,
      mode text not null,
      status text not null,
      sync_status text not null,
      device_timestamp text not null,
      latitude real,
      longitude real,
      accuracy_meters real,
      distance_meters real,
      photo_local_uri text,
      photo_storage_path text,
      photo_hash text,
      qr_token text,
      device_id text not null default '',
      is_offline_submission integer not null default 1,
      idempotency_key text not null unique,
      server_payload text,
      retry_count integer not null default 0,
      last_error text,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_events_status_starts on events(status, starts_at);
    create index if not exists idx_attendance_sync on attendance_sessions(sync_status, updated_at);
    create index if not exists idx_attendance_event on attendance_sessions(event_id, created_at);
  `);

  const columns = await db.getAllAsync<{ name: string }>("pragma table_info(attendance_sessions)");
  if (!columns.some((column) => column.name === "device_id")) {
    await db.execAsync("alter table attendance_sessions add column device_id text not null default ''");
  }
  if (!columns.some((column) => column.name === "is_offline_submission")) {
    await db.execAsync("alter table attendance_sessions add column is_offline_submission integer not null default 1");
  }
  if (!columns.some((column) => column.name === "photo_hash")) {
    await db.execAsync("alter table attendance_sessions add column photo_hash text");
  }

  await db.execAsync(`
    update attendance_sessions
    set status = case
      when mode = 'time_out' then 'completed'
      else 'time_in_recorded'
    end
    where status in ('pending_upload', 'pending_verification');
  `);
}

export async function setMetadata(key: string, value: string) {
  await db.runAsync(
    "insert into metadata (key, value) values (?, ?) on conflict(key) do update set value = excluded.value",
    key,
    value
  );
}

export async function getMetadata(key: string) {
  const row = await db.getFirstAsync<{ value: string }>("select value from metadata where key = ?", key);
  return row?.value ?? null;
}
