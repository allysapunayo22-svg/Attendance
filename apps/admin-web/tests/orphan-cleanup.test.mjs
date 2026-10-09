import assert from "node:assert/strict";
import test from "node:test";
import {
  EVIDENCE_BUCKET,
  MAX_BATCH_SIZE,
  parseCleanupOptions,
  runEvidenceCleanup,
  validCleanupSecret,
  validEvidencePath
} from "../../../supabase/functions/cleanup-orphan-evidence/core.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const oldDate = "2026-10-07T00:00:00.000Z";
const now = new Date("2026-10-09T00:00:00.000Z");
const path = `${userId}/${eventId}/time_in_12345678.jpg`;

function inventory(files) {
  return new Map([
    ["", [{ id: null, name: userId }]],
    [userId, [{ id: null, name: eventId }]],
    [`${userId}/${eventId}`, files]
  ]);
}

function harness({ files = [{ id: "object", name: "time_in_12345678.jpg", created_at: oldDate }], references = [], removeError = false } = {}) {
  const objects = inventory(files);
  const audits = [];
  const removed = [];
  let referenceCall = 0;
  return {
    audits,
    removed,
    deps: {
      now: () => now,
      runId: () => "run-id",
      list: async (prefix, offset, limit) => (objects.get(prefix) ?? []).slice(offset, offset + limit),
      isReferenced: async () => references[Math.min(referenceCall++, references.length - 1)] ?? false,
      remove: async (objectPath) => { if (removeError) throw new Error("failure"); removed.push(objectPath); },
      audit: async (entry) => { audits.push(entry); }
    }
  };
}

test("cleanup accepts only the current evidence path and hardcodes its bucket", () => {
  assert.equal(EVIDENCE_BUCKET, "attendance-evidence");
  assert.equal(validEvidencePath(path), true);
  assert.equal(validEvidencePath(`other/${eventId}/file.jpg`), false);
  assert.throws(() => parseCleanupOptions({ path, bucket: "other" }), /Unsupported/);
  assert.throws(() => parseCleanupOptions({ limit: 101 }), /integer/);
  assert.equal(parseCleanupOptions({}).dryRun, true);
});

test("referenced evidence and evidence younger than 24 hours are preserved", async () => {
  const referenced = harness({ references: [true] });
  const first = await runEvidenceCleanup({ dryRun: false }, referenced.deps);
  assert.equal(first.deleted, 0);
  assert.equal(referenced.removed.length, 0);
  assert.ok(referenced.audits.some((entry) => entry.reason === "canonical_reference_exists"));

  const young = harness({ files: [{ id: "young", name: "time_in_12345678.jpg", created_at: "2026-10-08T12:00:01.000Z" }] });
  const second = await runEvidenceCleanup({ dryRun: false }, young.deps);
  assert.equal(second.deleted, 0);
  assert.ok(young.audits.some((entry) => entry.reason === "younger_than_24_hours"));
});

test("old orphan is a dry-run candidate and is deleted only when explicitly enabled", async () => {
  const dry = harness();
  const preview = await runEvidenceCleanup({}, dry.deps);
  assert.equal(preview.eligible, 1);
  assert.equal(preview.deleted, 0);
  assert.deepEqual(dry.removed, []);

  const real = harness({ references: [false, false] });
  const result = await runEvidenceCleanup({ dryRun: false }, real.deps);
  assert.equal(result.deleted, 1);
  assert.deepEqual(real.removed, [path]);
});

test("malformed paths are skipped and batches never exceed 100 objects", async () => {
  const malformed = harness({ files: [{ id: "bad", name: "bad.png", created_at: oldDate }] });
  const first = await runEvidenceCleanup({ dryRun: false }, malformed.deps);
  assert.equal(first.skipped, 1);
  assert.equal(first.deleted, 0);

  const many = harness({ files: Array.from({ length: 130 }, (_, index) => ({ id: String(index), name: `bad-${index}.jpg`, created_at: oldDate })) });
  const second = await runEvidenceCleanup({ limit: MAX_BATCH_SIZE }, many.deps);
  assert.equal(second.considered, 100);
  assert.ok(second.considered <= MAX_BATCH_SIZE);
  assert.equal(second.truncated, true);
});

test("deletion failures are audited and a newly added reference closes the race", async () => {
  const failed = harness({ references: [false, false], removeError: true });
  const first = await runEvidenceCleanup({ dryRun: false }, failed.deps);
  assert.equal(first.failures, 1);
  assert.ok(failed.audits.some((entry) => entry.action === "evidence_cleanup_failed"));

  const raced = harness({ references: [false, true] });
  const second = await runEvidenceCleanup({ dryRun: false }, raced.deps);
  assert.equal(second.deleted, 0);
  assert.equal(second.skipped, 1);
  assert.ok(raced.audits.some((entry) => entry.reason === "reference_added_before_delete"));
});

test("student, anonymous, and wrong secrets do not authorize cleanup", async () => {
  assert.equal(await validCleanupSecret("", "server-secret"), false);
  assert.equal(await validCleanupSecret("student-jwt", "server-secret"), false);
  assert.equal(await validCleanupSecret("anon-key", "server-secret"), false);
  assert.equal(await validCleanupSecret("server-secret", "server-secret"), true);
});
