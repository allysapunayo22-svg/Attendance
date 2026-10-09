import assert from "node:assert/strict";
import test from "node:test";
import { validateGenerateQrPayload } from "../functions/generate-qr/validation.ts";
import { validateReviewPayload } from "../functions/review-attendance/validation.ts";

const attendanceId = "95000000-0000-4000-8000-000000000001";
const eventId = "94000000-0000-4000-8000-000000000001";

test("review validation preserves the existing Admin Web request contract", () => {
  assert.deepEqual(
    validateReviewPayload({ attendanceId, decision: "approve", notes: " Confirmed " }),
    { attendanceId, decision: "approve", notes: "Confirmed", rejectionReason: null }
  );
  assert.deepEqual(
    validateReviewPayload({ attendanceId, decision: "reject", notes: "Mismatch", rejectionReason: " Mismatch " }),
    { attendanceId, decision: "reject", notes: "Mismatch", rejectionReason: "Mismatch" }
  );
});

test("review validation rejects malformed identifiers, decisions, and missing rejection reasons", () => {
  assert.ok(validateReviewPayload({ attendanceId: "invalid", decision: "approve" }) instanceof Response);
  assert.ok(validateReviewPayload({ attendanceId, decision: "correct" }) instanceof Response);
  assert.ok(validateReviewPayload({ attendanceId, decision: "reject", notes: "Only notes" }) instanceof Response);
  assert.ok(validateReviewPayload({ attendanceId, decision: "approve", notes: "x".repeat(2001) }) instanceof Response);
});

test("QR validation accepts only a valid event and bounded integer TTL", () => {
  assert.deepEqual(validateGenerateQrPayload({ eventId }), { eventId, ttlSeconds: 30 });
  assert.deepEqual(validateGenerateQrPayload({ eventId, ttlSeconds: 10 }), { eventId, ttlSeconds: 10 });
  assert.deepEqual(validateGenerateQrPayload({ eventId, ttlSeconds: 300 }), { eventId, ttlSeconds: 300 });
  assert.ok(validateGenerateQrPayload({ eventId: "invalid", ttlSeconds: 30 }) instanceof Response);
  assert.ok(validateGenerateQrPayload({ eventId, ttlSeconds: 9 }) instanceof Response);
  assert.ok(validateGenerateQrPayload({ eventId, ttlSeconds: 301 }) instanceof Response);
  assert.ok(validateGenerateQrPayload({ eventId, ttlSeconds: 30.5 }) instanceof Response);
});
