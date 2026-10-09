import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BrowserLocationError,
  getCurrentBrowserLocation,
  isLocationAccurate,
  isLocationStale
} from "../lib/student/attendance/geolocation.ts";

const now = Date.parse("2026-10-06T08:00:00.000Z");

function fakePosition(overrides = {}) {
  return {
    coords: { latitude: 18.26, longitude: 121.99, accuracy: 12, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: now,
    ...overrides
  };
}

test("high-accuracy browser location succeeds with a capture timestamp", async () => {
  let options;
  const location = await getCurrentBrowserLocation({
    getCurrentPosition(success, _failure, receivedOptions) {
      options = receivedOptions;
      success(fakePosition());
    }
  }, () => now);
  assert.equal(location.latitude, 18.26);
  assert.equal(location.accuracy, 12);
  assert.equal(location.capturedAt, "2026-10-06T08:00:00.000Z");
  assert.deepEqual(options, { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 });
  assert.equal(isLocationAccurate(location, 20), true);
});

test("permission denial produces a controlled location error", async () => {
  await assert.rejects(getCurrentBrowserLocation({
    getCurrentPosition(_success, failure) {
      failure({ code: 1, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: "denied" });
    }
  }), (error) => error instanceof BrowserLocationError && error.code === "permission_denied");
});

test("timeout and unavailable location produce distinct controlled errors", async () => {
  for (const [code, expected] of [[3, "timeout"], [2, "unavailable"]]) {
    await assert.rejects(getCurrentBrowserLocation({
      getCurrentPosition(_success, failure) {
        failure({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: expected });
      }
    }), (error) => error instanceof BrowserLocationError && error.code === expected);
  }
});

test("unsupported, stale, and poor-accuracy states are rejected before submission", async () => {
  await assert.rejects(getCurrentBrowserLocation(undefined), (error) => error.code === "unsupported");
  await assert.rejects(getCurrentBrowserLocation({
    getCurrentPosition(success) {
      success(fakePosition({ timestamp: now - 61_000 }));
    }
  }, () => now), (error) => error.code === "stale");
  const inaccurate = { latitude: 18.26, longitude: 121.99, accuracy: 75, capturedAt: new Date(now).toISOString() };
  assert.equal(isLocationAccurate(inaccurate, 50), false);
  assert.equal(isLocationStale(inaccurate, now), false);
});
