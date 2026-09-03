import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client } = await getAuthenticatedUser(req);
    await requireAdmin(user.id, client);

    const body = await req.json();
    const decision = String(body.decision);
    const attendanceId = String(body.attendanceId);
    const notes = body.notes ? String(body.notes) : null;
    const rejectionReason = body.rejectionReason ? String(body.rejectionReason) : null;

    if (!["approve", "reject", "late", "excuse"].includes(decision)) {
      return jsonResponse({ error: "Invalid review decision." }, 400);
    }

    const { data: admin } = await client
      .from("admin_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    const nextStatus = decision === "approve" ? "verified" : decision === "excuse" ? "excused" : decision === "late" ? "late" : "rejected";

    const { error: updateError } = await client
      .from("attendance_sessions")
      .update({
        status: nextStatus,
        sync_status: nextStatus === "verified" ? "verified" : "requires_review",
        reviewed_by: admin?.id,
        reviewed_at: new Date().toISOString(),
        verification_reason: rejectionReason ?? notes ?? `Administrator marked attendance as ${nextStatus}.`
      })
      .eq("id", attendanceId);

    if (updateError) return jsonResponse({ error: updateError.message }, 400);

    const { error: reviewError } = await client.from("attendance_reviews").insert({
      attendance_session_id: attendanceId,
      reviewer_id: admin?.id,
      decision,
      notes,
      rejection_reason: rejectionReason
    });

    if (reviewError) return jsonResponse({ error: reviewError.message }, 400);

    await client.rpc("log_audit", {
      p_action: "attendance.review",
      p_entity_type: "attendance_session",
      p_entity_id: attendanceId,
      p_metadata: { decision, notes, rejectionReason }
    });

    return jsonResponse({ ok: true, status: nextStatus });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
