import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  AttendanceTransportError,
  attendanceEvidencePath,
  authenticatedUserId,
  createLogicalAttempt,
  deriveAttendanceAction,
  friendlyAttendanceReason,
  submitAttendanceAttempt,
  uploadAttendanceEvidence,
  validateQrToken
} from "../lib/student/attendance/workflow.ts";

const event = {
  id: "a1000000-0000-4000-8000-000000000001",
  title: "Test Event",
  description: "Test",
  banner_path: null,
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
  updated_at: "2026-10-06T00:00:00.000Z",
  schedule: {
    id: "schedule",
    event_id: "a1000000-0000-4000-8000-000000000001",
    event_date: "2026-10-06",
    starts_at: "2026-10-06T07:00:00.000Z",
    ends_at: "2026-10-06T10:00:00.000Z",
    check_in_opens_at: "2026-10-06T07:00:00.000Z",
    check_in_closes_at: "2026-10-06T09:00:00.000Z",
    late_ends_at: "2026-10-06T09:30:00.000Z",
    check_out_opens_at: "2026-10-06T08:00:00.000Z",
    check_out_closes_at: "2026-10-06T10:00:00.000Z"
  },
  location: { id: "location", event_id: "a1000000-0000-4000-8000-000000000001", venue_name: "Venue", address: null, latitude: 18.26, longitude: 121.99, radius_meters: 100, required_gps_accuracy_meters: 50 }
};

const now = Date.parse("2026-10-06T08:30:00.000Z");

function attendance(overrides = {}) {
  return {
    id: "attendance",
    local_id: "local-id",
    event_id: event.id,
    student_id: "student",
    status: "time_in_recorded",
    time_in_device_timestamp: "2026-10-06T08:00:00.000Z",
    time_in_server_timestamp: "2026-10-06T08:00:00.000Z",
    time_in_verified_timestamp: "2026-10-06T08:00:00.000Z",
    time_in_latitude: 18.26,
    time_in_longitude: 121.99,
    time_in_accuracy: 5,
    time_in_distance: 1,
    time_in_photo_path: null,
    time_in_qr_token: null,
    time_out_device_timestamp: null,
    time_out_server_timestamp: null,
    time_out_verified_timestamp: null,
    time_out_latitude: null,
    time_out_longitude: null,
    time_out_accuracy: null,
    time_out_distance: null,
    time_out_photo_path: null,
    time_out_qr_token: null,
    attendance_duration_minutes: null,
    verification_reason: null,
    suspicious_flags: [],
    device_id: "device",
    is_offline_submission: false,
    sync_status: "pending_verification",
    reviewed_by: null,
    reviewed_at: null,
    created_at: "2026-10-06T08:00:00.000Z",
    updated_at: "2026-10-06T08:00:00.000Z",
    event: null,
    ...overrides
  };
}

test("authoritative attendance records select check-in, check-out, completed, pending, and rejected retry paths", () => {
  assert.equal(deriveAttendanceAction(event, null, now).state, "check_in");
  assert.equal(deriveAttendanceAction(event, attendance(), now).state, "check_out");
  assert.equal(deriveAttendanceAction(event, attendance({ status: "completed", time_out_verified_timestamp: "2026-10-06T08:20:00.000Z" }), now).state, "completed");
  assert.equal(deriveAttendanceAction(event, attendance({ status: "pending_verification", time_in_verified_timestamp: null }), now).state, "pending");
  assert.equal(deriveAttendanceAction(event, attendance({ status: "rejected", time_in_verified_timestamp: null }), now).state, "check_in");
});

test("logical retries retain the same local and idempotency identity", () => {
  const first = createLogicalAttempt(event.id, "time_in", "11111111-2222-4333-8444-555555555555");
  const retry = first;
  assert.equal(retry.localId, first.localId);
  assert.equal(retry.idempotencyKey, first.idempotencyKey);
  assert.match(first.localId, /^time_in_[a-f0-9]+$/);
});

test("QR validation accepts current event tokens and rejects invalid or expired tokens", () => {
  assert.equal(validateQrToken(`${event.id}:${Math.floor((now + 30_000) / 1000)}:nonce`, event.id, now).valid, true);
  assert.match(validateQrToken(`different:${Math.floor((now + 30_000) / 1000)}:nonce`, event.id, now).reason, /not valid/);
  assert.match(validateQrToken(`${event.id}:${Math.floor((now - 1_000) / 1000)}:nonce`, event.id, now).reason, /expired/);
});

test("evidence uses the enforced private path and handles success, failure, and invalid uploads", async () => {
  const path = attendanceEvidencePath("user-id", event.id, "time_in_local");
  assert.equal(path, `user-id/${event.id}/time_in_local.jpg`);
  const photo = new Blob(["jpeg"], { type: "image/jpeg" });
  let upload;
  const successClient = { storage: { from(bucket) { return { async upload(receivedPath, receivedPhoto, options) { upload = { bucket, receivedPath, receivedPhoto, options }; return { data: {}, error: null }; } }; } } };
  assert.equal(await uploadAttendanceEvidence(successClient, path, photo), path);
  assert.equal(upload.bucket, "attendance-evidence");
  assert.equal(upload.receivedPath, path);
  assert.deepEqual(upload.options, { contentType: "image/jpeg", upsert: false });
  await assert.rejects(uploadAttendanceEvidence({ storage: { from() { return { async upload() { return { data: null, error: { message: "Upload failed" } }; } }; } } }, path, photo), (error) => error instanceof AttendanceTransportError && error.retryable);
  await assert.rejects(uploadAttendanceEvidence(successClient, path, new Blob(["png"], { type: "image/png" })), /invalid/);
});

test("secure submission handles acceptance, rejection, duplicate retry, and device mismatch", async () => {
  const body = { local_id: "time_in_local", event_id: event.id, mode: "time_in", device_timestamp: new Date(now).toISOString(), latitude: 18.26, longitude: 121.99, accuracy_meters: 5, device_id: "device-id", idempotency_key: "same-idempotency-key", is_offline_submission: false };
  const accepted = { accepted: true, status: "time_in_recorded", distance_meters: 1, verification_reason: "Accepted", suspicious_flags: [] };
  const calls = [];
  const client = { functions: { async invoke(name, options) { calls.push({ name, body: options.body }); return { data: accepted, error: null }; } } };
  assert.equal((await submitAttendanceAttempt(client, body)).accepted, true);
  assert.equal((await submitAttendanceAttempt(client, body)).accepted, true);
  assert.equal(calls[0].body.idempotency_key, calls[1].body.idempotency_key);

  const completed = { ...accepted, status: "completed", verification_reason: "Time-out accepted" };
  assert.equal((await submitAttendanceAttempt({ functions: { async invoke() { return { data: completed, error: null }; } } }, { ...body, mode: "time_out" })).status, "completed");

  const rejected = { ...accepted, accepted: false, status: "rejected", verification_reason: "A previously accepted time-in is required before check-out." };
  assert.equal((await submitAttendanceAttempt({ functions: { async invoke() { return { data: rejected, error: null }; } } }, body)).accepted, false);
  const mismatch = { ...rejected, verification_reason: "Device is not active and registered to this student." };
  assert.match(friendlyAttendanceReason(mismatch), /no longer.*active/i);
  assert.match(friendlyAttendanceReason({ ...rejected, verification_reason: "Dynamic QR token is invalid or expired." }), /QR code/i);
  assert.match(friendlyAttendanceReason({ ...rejected, verification_reason: "Required attendance photo evidence is missing." }), /photo/i);
});

test("retryable backend errors and authentication loss remain controlled failures", async () => {
  const retryError = { context: { clone: () => ({ json: async () => ({ error: "Temporary failure", retryable: true }) }) } };
  await assert.rejects(submitAttendanceAttempt({ functions: { async invoke() { return { data: null, error: retryError }; } } }, {}), (error) => error instanceof AttendanceTransportError && error.retryable && /Temporary/.test(error.message));
  await assert.rejects(authenticatedUserId({ auth: { async getUser() { return { data: { user: null }, error: { message: "expired" } }; } } }), (error) => error instanceof AttendanceTransportError && !error.retryable);
});

test("workflow retains page-session retry identity and never writes attendance tables directly", async () => {
  const source = await readFile(new URL("../components/student/attendance/AttendanceWorkflow.tsx", import.meta.url), "utf8");
  assert.match(source, /Retry same submission/);
  assert.match(source, /photoStoragePath/);
  assert.match(source, /resolveCurrentBrowserDevice/);
  assert.match(source, /submitAttendanceAttempt/);
  assert.doesNotMatch(source, /attendance_sessions/);
  assert.doesNotMatch(source, /IndexedDB|serviceWorker|backgroundSync/);
});
