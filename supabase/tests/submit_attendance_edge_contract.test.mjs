import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const submitSource = await readFile(new URL("../functions/submit-attendance/index.ts", import.meta.url), "utf8");
const sharedSource = await readFile(new URL("../functions/_shared/supabase.ts", import.meta.url), "utf8");

test("attendance submission uses the auth-bound v2 RPC", () => {
  assert.match(submitSource, /createAuthenticatedClient\(req\)/);
  assert.match(submitSource, /\.rpc\("submit_attendance_v2"/);
  assert.doesNotMatch(submitSource, /verify_attendance_submission/);
  assert.doesNotMatch(submitSource, /createServiceClient/);
});

test("RPC failures cannot fall back to direct service-role attendance writes", () => {
  assert.doesNotMatch(submitSource, /saveForAdminReview/);
  assert.doesNotMatch(submitSource, /\.from\("attendance_sessions"\)/);
  assert.doesNotMatch(submitSource, /\.from\("attendance_evidence"\)/);
  assert.match(submitSource, /retryable:\s*true/);
});

test("the RPC client forwards the authenticated bearer context with the anon key", () => {
  assert.match(sharedSource, /SUPABASE_ANON_KEY/);
  assert.match(sharedSource, /Authorization:\s*authorization/);
  assert.match(sharedSource, /authorization\.startsWith\("Bearer "\)/);
});

test("malformed device evidence is rejected before the typed RPC boundary", () => {
  assert.match(submitSource, /validateAttendancePayload\(body\)/);
});
