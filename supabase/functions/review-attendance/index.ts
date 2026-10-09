import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAuthenticatedClient, getAuthenticatedUser, requireAdmin } from "../_shared/supabase.ts";
import { validateReviewPayload } from "./validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client: serviceClient } = await getAuthenticatedUser(req);
    await requireAdmin(user.id, serviceClient);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "A valid JSON review request is required." }, 400);
    }

    const payload = validateReviewPayload(body);
    if (payload instanceof Response) return payload;

    const authenticatedClient = createAuthenticatedClient(req);
    const { data, error } = await authenticatedClient.rpc("review_attendance_v2", {
      p_attendance_session_id: payload.attendanceId,
      p_decision: payload.decision,
      p_notes: payload.notes,
      p_rejection_reason: payload.rejectionReason
    });

    if (error) {
      return jsonResponse({ error: "Unable to complete the attendance review atomically." }, 503);
    }

    const result = data as { ok?: boolean; status?: string; error?: string; code?: string; idempotent?: boolean } | null;
    if (!result?.ok) {
      const status = result?.code === "administrator_access_required" ? 403 : result?.code === "attendance_session_not_found" ? 404 : 409;
      return jsonResponse({ error: result?.error ?? "Attendance review was rejected.", code: result?.code }, status);
    }

    return jsonResponse({ ok: true, status: result.status, idempotent: Boolean(result.idempotent) });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
