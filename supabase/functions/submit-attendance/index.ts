import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAuthenticatedClient, getAuthenticatedUser } from "../_shared/supabase.ts";
import { validateAttendancePayload, type AttendancePayload } from "./validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await getAuthenticatedUser(req);
    const client = createAuthenticatedClient(req);
    const body = (await req.json()) as AttendancePayload;
    validateAttendancePayload(body);

    const { data, error } = await client.rpc("submit_attendance_v2", {
      p_event_id: body.event_id,
      p_mode: body.mode,
      p_device_timestamp: body.device_timestamp,
      p_latitude: body.latitude,
      p_longitude: body.longitude,
      p_accuracy_meters: body.accuracy_meters,
      p_photo_storage_path: body.photo_storage_path ?? null,
      p_photo_hash: body.photo_hash ?? null,
      p_qr_token: body.qr_token ?? null,
      p_device_id: body.device_id,
      p_local_id: body.local_id,
      p_idempotency_key: body.idempotency_key,
      p_is_offline_submission: body.is_offline_submission
    });

    if (error) {
      console.error("submit_attendance_v2 failed", error);
      return jsonResponse(
        {
          error: "Attendance verification is temporarily unavailable. Retry this submission without changing its idempotency key.",
          retryable: true
        },
        503
      );
    }

    return jsonResponse(data);
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
