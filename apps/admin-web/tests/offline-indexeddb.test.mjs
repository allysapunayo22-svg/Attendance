import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { indexedDB } from "fake-indexeddb";
import {
  OFFLINE_DB_NAME,
  cacheEventForOwner,
  getCachedEventForOwner,
  getOfflineAttendance,
  getOfflineAttendanceForOwner,
  putOfflineAttendance,
  updateOfflineAttendance
} from "../lib/student/offline/db.ts";

const event = {
  id: "event-a",
  title: "Cached event",
  description: "Safe offline event data",
  type: "school_event",
  requirement: "required",
  status: "published",
  photo_required: false,
  time_out_photo_required: false,
  dynamic_qr_required: false,
  early_time_out_allowed: true,
  minimum_attendance_minutes: 0,
  max_participants: null,
  registration_deadline: null,
  created_at: "2026-10-06T00:00:00.000Z",
  updated_at: "2026-10-06T00:00:00.000Z"
};

function record(ownerId, localId = "time_in_local", blob = new Blob(["jpeg"], { type: "image/jpeg" }), overrides = {}) {
  const now = "2026-10-06T08:00:00.000Z";
  return {
    id: `${ownerId}:${localId}`,
    ownerId,
    eventId: event.id,
    eventTitle: event.title,
    mode: "time_in",
    localId,
    idempotencyKey: `${event.id}:time_in:${localId}`,
    payload: { local_id: localId, event_id: event.id, mode: "time_in", device_timestamp: now, latitude: 18.26, longitude: 121.99, accuracy_meters: 5, idempotency_key: `${event.id}:time_in:${localId}`, is_offline_submission: true },
    browserFingerprintHash: "fingerprint",
    evidenceBlob: blob,
    evidenceMimeType: "image/jpeg",
    state: "queued",
    attemptCount: 0,
    automaticRetryCount: 0,
    nextAttemptAt: null,
    lastError: null,
    authoritativeResult: null,
    capturedOffline: true,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(OFFLINE_DB_NAME);
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
}

before(deleteDatabase);
after(deleteDatabase);

test("IndexedDB persists queued payloads and Blob evidence across database reopen", async () => {
  const original = record("owner-a");
  await putOfflineAttendance(original, indexedDB);
  const restored = await getOfflineAttendance("owner-a", original.localId, indexedDB);
  assert.equal(restored.idempotencyKey, original.idempotencyKey);
  assert.equal(await restored.evidenceBlob.text(), "jpeg");
  assert.equal(restored.payload.is_offline_submission, true);
});

test("queue records with the same logical ID remain isolated by authenticated owner", async () => {
  await putOfflineAttendance(record("owner-a", "shared-local"), indexedDB);
  await putOfflineAttendance(record("owner-b", "shared-local"), indexedDB);
  assert.equal((await getOfflineAttendanceForOwner("owner-a", indexedDB)).every((item) => item.ownerId === "owner-a"), true);
  assert.equal((await getOfflineAttendanceForOwner("owner-b", indexedDB)).every((item) => item.ownerId === "owner-b"), true);
  assert.equal((await getOfflineAttendanceForOwner("owner-b", indexedDB)).some((item) => item.id.startsWith("owner-a:")), false);
});

test("queue writes reject mismatched owner and logical identity fields", async () => {
  await assert.rejects(
    putOfflineAttendance(record("owner-a", "capture", undefined, { id: "owner-b:capture" }), indexedDB),
    /identity does not match/
  );
});

test("account switching isolates cached events", async () => {
  await cacheEventForOwner("owner-a", event, indexedDB);
  assert.equal((await getCachedEventForOwner("owner-a", event.id, indexedDB))?.title, event.title);
  assert.equal(await getCachedEventForOwner("owner-b", event.id, indexedDB), null);
});

test("retry updates preserve the original idempotency key and Blob", async () => {
  const original = record("owner-a", "retry-local");
  await putOfflineAttendance(original, indexedDB);
  await updateOfflineAttendance("owner-a", original.localId, { state: "retry_wait", attemptCount: 1, lastError: "network" }, indexedDB);
  const restored = await getOfflineAttendance("owner-a", original.localId, indexedDB);
  assert.equal(restored.idempotencyKey, original.idempotencyKey);
  assert.equal(await restored.evidenceBlob.text(), "jpeg");
  assert.equal(restored.attemptCount, 1);
});
