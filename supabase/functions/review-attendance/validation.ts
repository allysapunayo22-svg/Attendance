import { jsonResponse } from "../_shared/cors.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisions = new Set(["approve", "reject", "late", "excuse"] as const);

export type ReviewDecision = "approve" | "reject" | "late" | "excuse";

export function validateReviewPayload(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonResponse({ error: "A valid review request is required." }, 400);
  }

  const input = body as Record<string, unknown>;
  const attendanceId = typeof input.attendanceId === "string" ? input.attendanceId.trim() : "";
  const decision = typeof input.decision === "string" ? input.decision.trim() : "";
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;
  const rejectionReason =
    typeof input.rejectionReason === "string" && input.rejectionReason.trim() ? input.rejectionReason.trim() : null;

  if (!uuidPattern.test(attendanceId)) {
    return jsonResponse({ error: "A valid attendance session identifier is required." }, 400);
  }

  if (!decisions.has(decision as ReviewDecision)) {
    return jsonResponse({ error: "Invalid review decision." }, 400);
  }

  if ((notes?.length ?? 0) > 2000 || (rejectionReason?.length ?? 0) > 2000) {
    return jsonResponse({ error: "Review text must not exceed 2000 characters." }, 400);
  }

  if (decision === "reject" && !rejectionReason) {
    return jsonResponse({ error: "A rejection reason is required." }, 400);
  }

  return {
    attendanceId,
    decision: decision as ReviewDecision,
    notes,
    rejectionReason: decision === "reject" ? rejectionReason : null
  };
}
