import assert from "node:assert/strict";
import { test } from "node:test";
import { AttendanceTransportError } from "../lib/student/attendance/workflow.ts";
import { MAX_AUTOMATIC_RETRIES, createSingleFlightSync, nextAutomaticRetryAt, processOfflineRecord, recordIsDue, withOwnerSyncLock } from "../lib/student/offline/sync-core.ts";

const now = Date.parse("2026-10-06T08:00:00.000Z");
function record(overrides = {}) {
  return {
    id: "owner:local",
    ownerId: "owner",
    eventId: "event",
    eventTitle: "Offline event",
    mode: "time_in",
    localId: "local",
    idempotencyKey: "event:time_in:local",
    payload: { local_id: "local", event_id: "event", mode: "time_in", device_timestamp: new Date(now).toISOString(), latitude: 18.26, longitude: 121.99, accuracy_meters: 5, qr_token: "event:9999999999:nonce", photo_hash: "hash", idempotency_key: "event:time_in:local", is_offline_submission: true },
    browserFingerprintHash: "fingerprint",
    evidenceBlob: new Blob(["jpeg"], { type: "image/jpeg" }),
    evidenceMimeType: "image/jpeg",
    state: "queued",
    attemptCount: 0,
    automaticRetryCount: 0,
    nextAttemptAt: null,
    lastError: null,
    authoritativeResult: null,
    capturedOffline: true,
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    ...overrides
  };
}

function dependencies(options = {}) {
  const updates = [];
  const uploads = [];
  const submissions = [];
  let authenticatedOwner = options.authenticatedOwner ?? "owner";
  return {
    updates,
    uploads,
    submissions,
    setAuthenticatedOwner: (owner) => { authenticatedOwner = owner; },
    implementation: {
      now: () => now,
      authenticatedOwnerId: async () => authenticatedOwner,
      isCancelled: () => options.cancelled ?? false,
      currentFingerprint: async () => options.fingerprint ?? "fingerprint",
      resolveDevice: async () => options.device ?? { active: true, deviceId: "authoritative-device" },
      uploadEvidence: async (path, blob) => { uploads.push({ path, blob }); options.afterUpload?.(); if (options.uploadError) throw options.uploadError; },
      removeEvidence: async () => options.removedEvidence ?? true,
      submit: async (payload) => { submissions.push(payload); if (options.submitError) throw options.submitError; return options.result ?? { accepted: true, status: "time_in_recorded", distance_meters: 1, verification_reason: "Accepted", suspicious_flags: [] }; },
      update: async (localId, update) => updates.push({ localId, update })
    }
  };
}

test("sync uploads restored evidence then submits with the original logical identity", async () => {
  const deps = dependencies();
  assert.equal(await processOfflineRecord(record(), "owner", false, deps.implementation), "synced");
  assert.equal(deps.uploads[0].path, "owner/event/local.jpg");
  assert.equal(deps.submissions[0].idempotency_key, "event:time_in:local");
  assert.equal(deps.submissions[0].local_id, "local");
  assert.equal(deps.submissions[0].device_id, "authoritative-device");
  assert.equal(deps.submissions[0].qr_token, "event:9999999999:nonce");
  assert.equal(deps.updates.at(-1).update.state, "synced");
});

test("an existing evidence path skips duplicate upload", async () => {
  const deps = dependencies();
  await processOfflineRecord(record({ evidenceStoragePath: "owner/event/local.jpg" }), "owner", false, deps.implementation);
  assert.equal(deps.uploads.length, 0);
  assert.equal(deps.submissions[0].photo_storage_path, "owner/event/local.jpg");
});

test("retryable failures enter bounded retry wait without changing idempotency", async () => {
  const deps = dependencies({ submitError: new AttendanceTransportError("temporary", true) });
  assert.equal(await processOfflineRecord(record(), "owner", false, deps.implementation), "retrying");
  const retry = deps.updates.at(-1).update;
  assert.equal(retry.state, "retry_wait");
  assert.equal(retry.attemptCount, 1);
  assert.equal(recordIsDue({ ...record(), state: "retry_wait", nextAttemptAt: retry.nextAttemptAt }, false, now), false);
});

test("automatic retry scheduling honors backoff and pauses at the retry limit", () => {
  const retryAt = new Date(now + 30_000).toISOString();
  assert.equal(nextAutomaticRetryAt([record({ state: "retry_wait", nextAttemptAt: retryAt })], now), now + 30_000);
  assert.equal(nextAutomaticRetryAt([record({ state: "retry_wait", nextAttemptAt: retryAt, automaticRetryCount: MAX_AUTOMATIC_RETRIES })], now), null);
  assert.equal(recordIsDue(record({ state: "retry_wait", automaticRetryCount: MAX_AUTOMATIC_RETRIES }), true, now), true, "manual retry remains available");
});

test("terminal server rejection is not retried and stale captures remain server-authoritative", async () => {
  const stale = record({ payload: { ...record().payload, device_timestamp: new Date(now - 2 * 60 * 60 * 1000 - 1000).toISOString() } });
  const deps = dependencies({ result: { accepted: false, status: "rejected", distance_meters: null, verification_reason: "The attendance timestamp is stale.", suspicious_flags: ["stale_timestamp"] } });
  assert.equal(await processOfflineRecord(stale, "owner", false, deps.implementation), "rejected");
  assert.equal(deps.submissions.length, 1, "freshness remains authoritative on the server");
  assert.equal(deps.updates.at(-1).update.state, "rejected");
});

test("a replaced browser blocks queued sync before evidence upload or submission", async () => {
  const deps = dependencies({ device: { active: false, deviceId: null } });
  assert.equal(await processOfflineRecord(record(), "owner", false, deps.implementation), "blocked");
  assert.equal(deps.uploads.length, 0);
  assert.equal(deps.submissions.length, 0);
  assert.equal(deps.updates.at(-1).update.state, "blocked_device");
});

test("a record owned by another account is never mutated, uploaded, or submitted", async () => {
  const deps = dependencies({ authenticatedOwner: "owner-b" });
  assert.equal(await processOfflineRecord(record({ ownerId: "owner-a" }), "owner-b", false, deps.implementation), "skipped");
  assert.equal(deps.updates.length, 0);
  assert.equal(deps.uploads.length, 0);
  assert.equal(deps.submissions.length, 0);
});

test("an account change during evidence upload preserves the path and prevents submission", async () => {
  let deps;
  deps = dependencies({ afterUpload: () => deps.setAuthenticatedOwner("owner-b") });
  assert.equal(await processOfflineRecord(record(), "owner", false, deps.implementation), "authenticationRequired");
  assert.equal(deps.submissions.length, 0);
  assert.equal(deps.updates.some(({ update }) => update.evidenceStoragePath === "owner/event/local.jpg"), true);
  assert.equal(deps.updates.at(-1).update.state, "authentication_required");
  assert.equal(Object.hasOwn(deps.updates.at(-1).update, "evidenceBlob"), false);
});

test("session expiry preserves evidence and the original idempotency key for same-owner resume", async () => {
  const deps = dependencies({ submitError: new AttendanceTransportError("Session expired; sign in again", false) });
  assert.equal(await processOfflineRecord(record(), "owner", false, deps.implementation), "authenticationRequired");
  const update = deps.updates.at(-1).update;
  assert.equal(update.state, "authentication_required");
  assert.equal(Object.hasOwn(update, "evidenceBlob"), false);
  assert.equal(deps.submissions[0].idempotency_key, record().idempotencyKey);
});

test("the same owner can resume an authentication-paused record without uploading evidence again", async () => {
  const saved = record({
    state: "authentication_required",
    evidenceStoragePath: "owner/event/local.jpg",
    lastError: "Sign in again with the same account to resume this saved attendance."
  });
  const deps = dependencies({ authenticatedOwner: "owner" });
  assert.equal(await processOfflineRecord(saved, "owner", true, deps.implementation), "synced");
  assert.equal(deps.uploads.length, 0);
  assert.equal(deps.submissions.length, 1);
  assert.equal(deps.submissions[0].idempotency_key, saved.idempotencyKey);
  assert.equal(deps.submissions[0].photo_storage_path, saved.evidenceStoragePath);
});

test("the final automatic failure pauses retries while a later manual attempt can still succeed", async () => {
  const finalAutomaticAttempt = record({ automaticRetryCount: MAX_AUTOMATIC_RETRIES - 1, attemptCount: MAX_AUTOMATIC_RETRIES - 1 });
  const failed = dependencies({ submitError: new AttendanceTransportError("temporary", true) });
  assert.equal(await processOfflineRecord(finalAutomaticAttempt, "owner", false, failed.implementation), "retrying");
  assert.equal(failed.updates.at(-1).update.automaticRetryCount, MAX_AUTOMATIC_RETRIES);
  assert.equal(failed.updates.at(-1).update.nextAttemptAt, null);

  const resumed = dependencies();
  assert.equal(await processOfflineRecord({ ...finalAutomaticAttempt, state: "retry_wait", automaticRetryCount: MAX_AUTOMATIC_RETRIES }, "owner", true, resumed.implementation), "synced");
  assert.equal(resumed.submissions[0].idempotency_key, finalAutomaticAttempt.idempotencyKey);
});

test("terminal rejection reports an orphan when Storage deletes zero objects", async () => {
  const deps = dependencies({ removedEvidence: false, result: { accepted: false, status: "rejected", verification_reason: "Rejected", suspicious_flags: [] } });
  assert.equal(await processOfflineRecord(record({ evidenceStoragePath: "owner/event/local.jpg" }), "owner", false, deps.implementation), "rejected");
  assert.equal(deps.updates.at(-1).update.evidenceOrphaned, true);
});

test("a persisted evidence path must match the exact owner, event, and queue item", async () => {
  const deps = dependencies();
  assert.equal(await processOfflineRecord(record({ evidenceStoragePath: "owner/other-event/local.jpg" }), "owner", false, deps.implementation), "blocked");
  assert.equal(deps.submissions.length, 0);
  assert.equal(deps.updates.at(-1).update.state, "blocked_integrity");
});

test("single-flight synchronization prevents concurrent duplicate processing", async () => {
  let calls = 0;
  let release;
  const run = createSingleFlightSync(() => new Promise((resolve) => { calls += 1; release = resolve; }));
  const first = run();
  const second = run();
  assert.equal(first, second);
  assert.equal(calls, 1);
  release("done");
  assert.equal(await first, "done");
});

test("cross-tab owner lock skips a concurrent retry while another tab holds the lock", async () => {
  let held = false;
  const locks = {
    request: async (_name, _options, callback) => {
      if (held) return callback(null);
      held = true;
      try { return await callback({}); } finally { held = false; }
    }
  };
  let release;
  const first = withOwnerSyncLock("owner", () => new Promise((resolve) => { release = resolve; }), locks);
  await Promise.resolve();
  const second = await withOwnerSyncLock("owner", async () => "duplicate", locks);
  assert.equal(second, null);
  release("done");
  assert.equal(await first, "done");
});
