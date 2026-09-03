// Web implementation of the client database using browser localStorage and memory.
// Automatically imported by Metro on web instead of client.ts (which uses native expo-sqlite).

interface StorageState {
  metadata: Record<string, string>;
  events: Record<string, { id: string; payload: string; status: string; starts_at: string | null; updated_at: string }>;
  announcements: Record<string, { id: string; payload: string; publish_at: string }>;
  attendance_sessions: Record<string, any>;
  student_profile: Record<string, any>;
}

const STORAGE_KEY = "attendance_pwa_local_db";

function loadStorage(): StorageState {
  if (typeof window === "undefined" || !window.localStorage) {
    return { metadata: {}, events: {}, announcements: {}, attendance_sessions: {}, student_profile: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        metadata: parsed.metadata || {},
        events: parsed.events || {},
        announcements: parsed.announcements || {},
        attendance_sessions: parsed.attendance_sessions || {},
        student_profile: parsed.student_profile || {}
      };
    }
  } catch (err) {
    console.warn("Error loading local storage for attendance PWA:", err);
  }
  return { metadata: {}, events: {}, announcements: {}, attendance_sessions: {}, student_profile: {} };
}

function saveStorage(state: StorageState) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Error saving local storage for attendance PWA:", err);
  }
}

let state: StorageState = loadStorage();

export const db = {
  async execAsync(_sql: string): Promise<void> {
    state = loadStorage();
  },

  async runAsync(query: string, ...params: any[]): Promise<{ changes: number; lastInsertRowId: number }> {
    state = loadStorage();
    const normalized = query.trim().toLowerCase();

    // 1. DELETE FROM events WHERE id NOT IN (...)
    if (normalized.startsWith("delete from events")) {
      if (normalized.includes("where id not in")) {
        const allowedIds = new Set(params.map(String));
        for (const id of Object.keys(state.events)) {
          if (!allowedIds.has(id)) {
            delete state.events[id];
          }
        }
      } else {
        state.events = {};
      }
      saveStorage(state);
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 2. INSERT INTO events
    if (normalized.startsWith("insert into events")) {
      const [id, payload, status, starts_at, updated_at] = params;
      state.events[String(id)] = {
        id: String(id),
        payload: String(payload),
        status: String(status),
        starts_at: starts_at ? String(starts_at) : null,
        updated_at: String(updated_at)
      };
      saveStorage(state);
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 3. INSERT INTO metadata
    if (normalized.startsWith("insert into metadata")) {
      const [key, value] = params;
      state.metadata[String(key)] = String(value);
      saveStorage(state);
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 4. INSERT INTO attendance_sessions
    if (normalized.startsWith("insert into attendance_sessions")) {
      const [
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
      ] = params;

      state.attendance_sessions[String(local_id)] = {
        local_id: String(local_id),
        event_id: String(event_id),
        mode: String(mode),
        status: String(status),
        sync_status: String(sync_status),
        device_timestamp: String(device_timestamp),
        latitude: Number(latitude) || null,
        longitude: Number(longitude) || null,
        accuracy_meters: Number(accuracy_meters) || 0,
        distance_meters: distance_meters != null ? Number(distance_meters) : null,
        photo_local_uri: photo_local_uri || null,
        photo_storage_path: photo_storage_path || null,
        photo_hash: photo_hash || null,
        qr_token: qr_token || null,
        device_id: String(device_id || ""),
        is_offline_submission: is_offline_submission ? 1 : 0,
        idempotency_key: String(idempotency_key),
        retry_count: Number(retry_count) || 0,
        last_error: last_error || null,
        created_at: String(created_at),
        updated_at: String(updated_at),
        server_payload: null
      };
      saveStorage(state);
      return { changes: 1, lastInsertRowId: 0 };
    }

    // 5. UPDATE attendance_sessions
    if (normalized.startsWith("update attendance_sessions")) {
      // Typically: update attendance_sessions set sync_status = ?, status = coalesce(?, status), ... where local_id = ?
      const localId = params[params.length - 1];
      const record = state.attendance_sessions[String(localId)];
      if (record) {
        const [sync_status, status, photo_storage_path, server_payload, last_error, retry_count, updated_at] = params;
        if (sync_status !== undefined && sync_status !== null) record.sync_status = sync_status;
        if (status !== null && status !== undefined) record.status = status;
        if (photo_storage_path !== null && photo_storage_path !== undefined) record.photo_storage_path = photo_storage_path;
        if (server_payload !== null && server_payload !== undefined) record.server_payload = server_payload;
        if (last_error !== undefined) record.last_error = last_error;
        if (retry_count !== null && retry_count !== undefined) record.retry_count = retry_count;
        if (updated_at) record.updated_at = updated_at;
        saveStorage(state);
        return { changes: 1, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    saveStorage(state);
    return { changes: 0, lastInsertRowId: 0 };
  },

  async getAllAsync<T>(query: string, ..._params: any[]): Promise<T[]> {
    state = loadStorage();
    const normalized = query.trim().toLowerCase();

    // SELECT * FROM attendance_sessions WHERE sync_status IN (...)
    if (normalized.includes("from attendance_sessions")) {
      const records = Object.values(state.attendance_sessions);
      if (normalized.includes("where sync_status in")) {
        const filtered = records.filter((r) => r.sync_status === "pending_upload" || r.sync_status === "failed");
        filtered.sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
        return filtered.slice(0, 20) as unknown as T[];
      }
      // order by created_at desc
      records.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return records as unknown as T[];
    }

    // SELECT payload FROM events ORDER BY starts_at ASC
    if (normalized.includes("from events")) {
      const events = Object.values(state.events);
      events.sort((a, b) => ((a.starts_at || "") > (b.starts_at || "") ? 1 : -1));
      return events.map((e) => ({ payload: e.payload })) as unknown as T[];
    }

    // SELECT payload FROM announcements
    if (normalized.includes("from announcements")) {
      const announcements = Object.values(state.announcements);
      announcements.sort((a, b) => ((a.publish_at || "") < (b.publish_at || "") ? 1 : -1));
      return announcements.map((a) => ({ payload: a.payload })) as unknown as T[];
    }

    // pragma table_info
    if (normalized.includes("pragma table_info")) {
      return [
        { name: "device_id" },
        { name: "is_offline_submission" },
        { name: "photo_hash" }
      ] as unknown as T[];
    }

    return [] as T[];
  },

  async getFirstAsync<T>(query: string, ...params: any[]): Promise<T | null> {
    state = loadStorage();
    const normalized = query.trim().toLowerCase();

    // SELECT value FROM metadata WHERE key = ?
    if (normalized.includes("from metadata")) {
      const key = String(params[0]);
      const value = state.metadata[key];
      return value !== undefined ? ({ value } as unknown as T) : null;
    }

    // SELECT payload FROM events WHERE id = ?
    if (normalized.includes("from events") && normalized.includes("where id =")) {
      const id = String(params[0]);
      const event = state.events[id];
      return event ? ({ payload: event.payload } as unknown as T) : null;
    }

    // SELECT * FROM attendance_sessions WHERE local_id = ?
    if (normalized.includes("from attendance_sessions") && normalized.includes("where local_id =")) {
      const localId = String(params[0]);
      return (state.attendance_sessions[localId] as unknown as T) || null;
    }

    // SELECT ... FROM attendance_sessions WHERE event_id = ? ...
    if (normalized.includes("from attendance_sessions") && normalized.includes("event_id =")) {
      const [eventId, modeParam] = params;
      const records = Object.values(state.attendance_sessions).filter((r) => {
        if (r.event_id !== eventId) return false;
        if (modeParam && r.mode !== modeParam) return false;
        return true;
      });
      records.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      return (records[0] as unknown as T) || null;
    }

    return null;
  },

  async withTransactionAsync(callback: () => Promise<void>): Promise<void> {
    await callback();
  }
};

export async function initDatabase() {
  state = loadStorage();
}

export async function setMetadata(key: string, value: string) {
  state = loadStorage();
  state.metadata[key] = value;
  saveStorage(state);
}

export async function getMetadata(key: string) {
  state = loadStorage();
  return state.metadata[key] ?? null;
}
