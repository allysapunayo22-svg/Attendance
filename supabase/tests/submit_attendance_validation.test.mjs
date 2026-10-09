import assert from "node:assert/strict";
import { test } from "node:test";
import { validateAttendancePayload } from "../functions/submit-attendance/validation.ts";

const validPayload = {
  local_id: "time_in_local_123",
  event_id: "60000000-0000-4000-8000-000000000001",
  mode: "time_in",
  device_timestamp: "2026-10-05T09:00:00.000Z",
  latitude: 18.265,
  longitude: 121.995,
  accuracy_meters: 10,
  device_id: "30000000-0000-4000-8000-000000000001",
  idempotency_key: "event:device:time_in:local",
  is_offline_submission: false
};

test("valid mobile attendance payload keeps the existing request contract", () => {
  assert.doesNotThrow(() => validateAttendancePayload(validPayload));
});

test("malformed and null timestamps are rejected with HTTP 400 responses", () => {
  for (const device_timestamp of ["not-a-timestamp", null, ""]) {
    assert.throws(
      () => validateAttendancePayload({ ...validPayload, device_timestamp }),
      error => error instanceof Response && error.status === 400
    );
  }
});

test("non-finite, out-of-range and negative location evidence is rejected", () => {
  for (const override of [
    { latitude: Number.NaN },
    { latitude: 91 },
    { longitude: Number.POSITIVE_INFINITY },
    { longitude: -181 },
    { accuracy_meters: Number.NaN },
    { accuracy_meters: -1 }
  ]) {
    assert.throws(
      () => validateAttendancePayload({ ...validPayload, ...override }),
      error => error instanceof Response && error.status === 400
    );
  }
});
