import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  BROWSER_IDENTITY_STORAGE_KEY,
  browserDeviceStatusCopy,
  canBeginAttendance,
  getOrCreateBrowserIdentity,
  hashBrowserIdentity,
  registerCurrentBrowser,
  resolveCurrentBrowserDevice
} from "../lib/student/browser-device.ts";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values
  };
}

function rpcClient(handler) {
  return { rpc: async (name, args) => handler(name, args) };
}

test("first visit has no browser registration and makes no RPC call", async () => {
  const storage = memoryStorage();
  let calls = 0;
  const state = await resolveCurrentBrowserDevice(rpcClient(() => { calls += 1; }), { storage, crypto: webcrypto });
  assert.deepEqual(state, { status: "no_browser_identity", deviceId: null, anotherDeviceActive: false });
  assert.equal(calls, 0);
  assert.equal(canBeginAttendance(state), false);
});

test("browser identity is random, stable locally, and sent only as a SHA-256 hash", async () => {
  const storage = memoryStorage();
  const identity = getOrCreateBrowserIdentity(storage, webcrypto);
  assert.equal(identity, getOrCreateBrowserIdentity(storage, webcrypto));
  assert.equal(storage.getItem(BROWSER_IDENTITY_STORAGE_KEY), identity);

  const fingerprint = await hashBrowserIdentity(identity, webcrypto);
  assert.match(fingerprint, /^[0-9a-f]{64}$/);
  assert.notEqual(fingerprint, identity);

  let received;
  const state = await registerCurrentBrowser(rpcClient((name, args) => {
    received = { name, args };
    return { data: { status: "active", device_id: "browser-device-a", platform: "web" }, error: null };
  }), { storage, crypto: webcrypto });

  assert.equal(received.name, "register_student_device_v1");
  assert.equal(received.args.p_fingerprint_hash, fingerprint);
  assert.equal(received.args.p_browser_label, "Web Browser");
  assert.equal(Object.values(received.args).includes(identity), false);
  assert.equal(canBeginAttendance(state), true);
});

test("registration errors remain failures and do not authorize attendance", async () => {
  const storage = memoryStorage();
  await assert.rejects(
    registerCurrentBrowser(rpcClient(() => ({ data: null, error: { message: "Registration denied" } })), { storage, crypto: webcrypto }),
    /Registration denied/
  );
  assert.ok(storage.getItem(BROWSER_IDENTITY_STORAGE_KEY), "retry retains the page-local browser identity");
});

test("authoritative resolution detects activation, replacement, and re-registration", async () => {
  const storage = memoryStorage();
  getOrCreateBrowserIdentity(storage, webcrypto);
  const responses = [
    { status: "active", device_id: "browser-device-a" },
    { status: "inactive", device_id: null, another_device_active: true },
    { status: "active", device_id: "browser-device-a" }
  ];
  const client = rpcClient(() => ({ data: responses.shift(), error: null }));

  const active = await resolveCurrentBrowserDevice(client, { storage, crypto: webcrypto });
  assert.equal(canBeginAttendance(active), true);

  const replaced = await resolveCurrentBrowserDevice(client, { storage, crypto: webcrypto });
  assert.equal(replaced.status, "inactive");
  assert.equal(replaced.anotherDeviceActive, true);
  assert.equal(replaced.deviceId, null);
  assert.equal(canBeginAttendance(replaced), false, "a stale previously returned UUID is never reused");

  const reactivated = await registerCurrentBrowser(client, { storage, crypto: webcrypto });
  assert.equal(canBeginAttendance(reactivated), true);
});

test("device status copy covers unregistered, active, inactive, and another-device states", () => {
  assert.match(browserDeviceStatusCopy("no_browser_identity").title, /Registration required/i);
  assert.match(browserDeviceStatusCopy("unregistered").title, /No browser registered/i);
  assert.match(browserDeviceStatusCopy("active").title, /browser is active/i);
  assert.match(browserDeviceStatusCopy("inactive", true).description, /Another phone or browser/i);
  assert.match(browserDeviceStatusCopy("another_device_active").title, /Another device/i);
});

test("Student Web requires explicit confirmation and gates attendance through the device boundary", async () => {
  const source = await readFile(new URL("../components/student/BrowserDeviceEnrollment.tsx", import.meta.url), "utf8");
  const boundary = await readFile(new URL("../components/student/AttendanceActionBoundary.tsx", import.meta.url), "utf8");
  assert.match(source, /Register this browser/);
  assert.match(source, /currently active phone or browser will be deactivated/);
  assert.match(source, /setConfirming\(true\)/);
  assert.match(boundary, /deviceReady=\{deviceReady \|\| offlineReady\}/);
  assert.match(boundary, /offlineCaptureAllowed/);
  assert.match(boundary, /onDeviceInvalid=\{handleDeviceInvalid\}/);
});
