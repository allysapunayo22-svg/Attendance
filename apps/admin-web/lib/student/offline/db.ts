import type { Event } from "@attendance/types";
import type { StudentAttendanceRecord } from "../types";
import type {
  OfflineAttendanceCacheRecord,
  OfflineAttendanceRecord,
  OfflineEventRecord,
  OfflineQueueState
} from "./types";

export const OFFLINE_DB_NAME = "clickin-student-offline-v1";
export const OFFLINE_DB_VERSION = 1;
const QUEUE_STORE = "attendance_queue";
const EVENT_STORE = "event_cache";
const ATTENDANCE_STORE = "attendance_cache";

type StoreName = typeof QUEUE_STORE | typeof EVENT_STORE | typeof ATTENDANCE_STORE;

function availableIndexedDb(factory?: IDBFactory) {
  const resolved = factory ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
  if (!resolved) throw new Error("Durable offline storage is not supported by this browser.");
  return resolved;
}

export function openOfflineDatabase(factory?: IDBFactory) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = availableIndexedDb(factory).open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline storage."));
    request.onblocked = () => reject(new Error("Offline storage is blocked by another ClickIn tab."));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const store = database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
      }
      if (!database.objectStoreNames.contains(EVENT_STORE)) {
        const store = database.createObjectStore(EVENT_STORE, { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
      }
      if (!database.objectStoreNames.contains(ATTENDANCE_STORE)) {
        const store = database.createObjectStore(ATTENDANCE_STORE, { keyPath: "id" });
        store.createIndex("ownerId", "ownerId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Offline storage request failed."));
  });
}

function transactionResult(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Offline storage transaction failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline storage transaction was cancelled."));
  });
}

async function inStore<T>(storeName: StoreName, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>, factory?: IDBFactory) {
  const database = await openOfflineDatabase(factory);
  try {
    const transaction = database.transaction(storeName, mode);
    const completed = transactionResult(transaction);
    const result = await requestResult(operation(transaction.objectStore(storeName)));
    await completed;
    return result;
  } finally {
    database.close();
  }
}

export function queueRecordId(ownerId: string, localId: string) {
  return `${ownerId}:${localId}`;
}

export async function putOfflineAttendance(record: OfflineAttendanceRecord, factory?: IDBFactory) {
  if (record.id !== queueRecordId(record.ownerId, record.localId)
    || record.eventId !== record.payload.event_id
    || record.localId !== record.payload.local_id
    || record.idempotencyKey !== record.payload.idempotency_key) {
    throw new Error("Offline attendance identity does not match its owner or logical submission.");
  }
  await inStore(QUEUE_STORE, "readwrite", (store) => store.put(record), factory);
  notifyOfflineQueueChanged(record.ownerId);
  return record;
}

export async function getOfflineAttendance(ownerId: string, localId: string, factory?: IDBFactory) {
  return (await inStore(QUEUE_STORE, "readonly", (store) => store.get(queueRecordId(ownerId, localId)), factory) as OfflineAttendanceRecord | undefined) ?? null;
}

export async function getOfflineAttendanceForOwner(ownerId: string, factory?: IDBFactory) {
  const records = await inStore(QUEUE_STORE, "readonly", (store) => store.index("ownerId").getAll(ownerId), factory) as OfflineAttendanceRecord[];
  return records.sort((first, second) => first.createdAt.localeCompare(second.createdAt));
}

export async function updateOfflineAttendance(ownerId: string, localId: string, updates: Partial<OfflineAttendanceRecord>, factory?: IDBFactory) {
  const current = await getOfflineAttendance(ownerId, localId, factory);
  if (!current) return null;
  const next = { ...current, ...updates, id: current.id, ownerId: current.ownerId, localId: current.localId, updatedAt: new Date().toISOString() };
  return putOfflineAttendance(next, factory);
}

export async function countOfflineAttendance(ownerId: string, states?: OfflineQueueState[], factory?: IDBFactory) {
  const records = await getOfflineAttendanceForOwner(ownerId, factory);
  return states ? records.filter((record) => states.includes(record.state)).length : records.length;
}

async function replaceOwnerRecords<T extends { id: string; ownerId: string }>(storeName: StoreName, ownerId: string, records: T[], factory?: IDBFactory) {
  const database = await openOfflineDatabase(factory);
  try {
    const transaction = database.transaction(storeName, "readwrite");
    const completed = transactionResult(transaction);
    const store = transaction.objectStore(storeName);
    const existing = await requestResult(store.index("ownerId").getAllKeys(ownerId));
    existing.forEach((key) => store.delete(key));
    records.forEach((record) => store.put(record));
    await completed;
  } finally {
    database.close();
  }
}

export async function cacheEventsForOwner(ownerId: string, events: Event[], factory?: IDBFactory) {
  const cachedAt = new Date().toISOString();
  const records: OfflineEventRecord[] = events.map((event) => ({ id: `${ownerId}:${event.id}`, ownerId, eventId: event.id, event, cachedAt }));
  await replaceOwnerRecords(EVENT_STORE, ownerId, records, factory);
}

export async function cacheEventForOwner(ownerId: string, event: Event, factory?: IDBFactory) {
  const record: OfflineEventRecord = { id: `${ownerId}:${event.id}`, ownerId, eventId: event.id, event, cachedAt: new Date().toISOString() };
  await inStore(EVENT_STORE, "readwrite", (store) => store.put(record), factory);
}

export async function getCachedEventsForOwner(ownerId: string, factory?: IDBFactory) {
  const records = await inStore(EVENT_STORE, "readonly", (store) => store.index("ownerId").getAll(ownerId), factory) as OfflineEventRecord[];
  return records.map((record) => record.event);
}

export async function getCachedEventForOwner(ownerId: string, eventId: string, factory?: IDBFactory) {
  const record = await inStore(EVENT_STORE, "readonly", (store) => store.get(`${ownerId}:${eventId}`), factory) as OfflineEventRecord | undefined;
  return record?.event ?? null;
}

export async function cacheAttendanceForOwner(ownerId: string, attendance: StudentAttendanceRecord[], factory?: IDBFactory) {
  const cachedAt = new Date().toISOString();
  const records: OfflineAttendanceCacheRecord[] = attendance.map((item) => ({ id: `${ownerId}:${item.id}`, ownerId, attendanceId: item.id, attendance: item, cachedAt }));
  await replaceOwnerRecords(ATTENDANCE_STORE, ownerId, records, factory);
}

export async function getCachedAttendanceForOwner(ownerId: string, factory?: IDBFactory) {
  const records = await inStore(ATTENDANCE_STORE, "readonly", (store) => store.index("ownerId").getAll(ownerId), factory) as OfflineAttendanceCacheRecord[];
  return records.map((record) => record.attendance);
}

export const OFFLINE_QUEUE_CHANGED_EVENT = "clickin:offline-queue-changed";

export function notifyOfflineQueueChanged(ownerId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED_EVENT, { detail: { ownerId } }));
}
