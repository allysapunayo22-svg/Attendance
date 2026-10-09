import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("review-attendance delegates its only writes to the auth-bound transactional RPC", async () => {
  const reviewSource = await source("supabase/functions/review-attendance/index.ts");
  assert.match(reviewSource, /requireAdmin\(user\.id, serviceClient\)/);
  assert.match(reviewSource, /createAuthenticatedClient\(req\)/);
  assert.match(reviewSource, /rpc\("review_attendance_v2"/);
  assert.doesNotMatch(reviewSource, /\.from\("attendance_sessions"\)/);
  assert.doesNotMatch(reviewSource, /\.from\("attendance_reviews"\)/);
  assert.doesNotMatch(reviewSource, /log_audit/);
});

test("generate-qr delegates token creation, storage, authorization, and audit to its RPC", async () => {
  const qrSource = await source("supabase/functions/generate-qr/index.ts");
  assert.match(qrSource, /requireAdmin\(user\.id, serviceClient\)/);
  assert.match(qrSource, /createAuthenticatedClient\(req\)/);
  assert.match(qrSource, /rpc\("generate_event_qr_token"/);
  assert.doesNotMatch(qrSource, /event_qr_tokens/);
  assert.doesNotMatch(qrSource, /crypto\.subtle|randomUUID/);
  assert.doesNotMatch(qrSource, /log_audit/);
});

test("active-admin Edge check requires an active account and an admin profile", async () => {
  const sharedSource = await source("supabase/functions/_shared/supabase.ts");
  assert.match(sharedSource, /select\("role,is_active"\)/);
  assert.match(sharedSource, /!userRecord\.is_active/);
  assert.match(sharedSource, /\.from\("admin_profiles"\)/);
  assert.match(sharedSource, /!adminProfile/);
});

test("active callers no longer invoke the generic log_audit function", async () => {
  const activeSources = await Promise.all([
    source("supabase/functions/review-attendance/index.ts"),
    source("supabase/functions/generate-qr/index.ts"),
    source("supabase/functions/send-notification/index.ts"),
    source("apps/admin-web/components/events/EventForm.tsx"),
    source("apps/admin-web/components/events/EventEditForm.tsx")
  ]);
  for (const activeSource of activeSources) assert.doesNotMatch(activeSource, /log_audit/);
});

test("attendance evidence signed URLs use the shortened lifetime", async () => {
  const [queueSource, liveSource] = await Promise.all([
    source("apps/admin-web/components/attendance/AttendanceReviewQueue.tsx"),
    source("apps/admin-web/components/attendance/LiveAttendanceTable.tsx")
  ]);
  assert.match(queueSource, /createSignedUrl\(path, 120\)/);
  assert.match(liveSource, /createSignedUrl\(selectedRecord\.time_in_photo_path, 120\)/);
});
