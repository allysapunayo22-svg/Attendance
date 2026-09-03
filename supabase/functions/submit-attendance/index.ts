import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient, getAuthenticatedUser } from "../_shared/supabase.ts";

interface AttendancePayload {
  local_id: string;
  event_id: string;
  mode: "time_in" | "time_out";
  device_timestamp: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  photo_storage_path?: string;
  photo_hash?: string;
  qr_token?: string;
  device_id: string;
  idempotency_key: string;
  is_offline_submission: boolean;
}

function validatePayload(body: Partial<AttendancePayload>) {
  const required = ["local_id", "event_id", "mode", "device_timestamp", "latitude", "longitude", "accuracy_meters", "device_id", "idempotency_key"] as const;
  for (const key of required) {
    if (body[key] === undefined || body[key] === null || body[key] === "") {
      throw new Response(JSON.stringify({ error: `Missing ${key}.` }), { status: 400 });
    }
  }

  if (!["time_in", "time_out"].includes(String(body.mode))) {
    throw new Response(JSON.stringify({ error: "Invalid attendance mode." }), { status: 400 });
  }

  if (Number(body.accuracy_meters) < 0 || Number(body.accuracy_meters) > 1000) {
    throw new Response(JSON.stringify({ error: "Invalid GPS accuracy." }), { status: 400 });
  }
}

async function saveForAdminReview(
  client: ReturnType<typeof createServiceClient>,
  studentId: string,
  body: AttendancePayload,
  verificationError: string
) {
  const attendanceFields = body.mode === "time_in"
    ? {
        time_in_device_timestamp: body.device_timestamp,
        time_in_server_timestamp: new Date().toISOString(),
        time_in_latitude: body.latitude,
        time_in_longitude: body.longitude,
        time_in_accuracy: body.accuracy_meters,
        time_in_photo_path: body.photo_storage_path ?? null,
        time_in_qr_token: body.qr_token ?? null
      }
    : {
        time_out_device_timestamp: body.device_timestamp,
        time_out_server_timestamp: new Date().toISOString(),
        time_out_latitude: body.latitude,
        time_out_longitude: body.longitude,
        time_out_accuracy: body.accuracy_meters,
        time_out_photo_path: body.photo_storage_path ?? null,
        time_out_qr_token: body.qr_token ?? null
      };

  const { data: attendance, error: attendanceError } = await client
    .from("attendance_sessions")
    .upsert(
      {
        local_id: body.local_id,
        event_id: body.event_id,
        student_id: studentId,
        status: "pending_verification",
        sync_status: "requires_review",
        verification_reason: `Automatic verification failed: ${verificationError}`,
        suspicious_flags: ["verification_error"],
        device_id: body.device_id,
        is_offline_submission: body.is_offline_submission,
        ...attendanceFields
      },
      { onConflict: "event_id,student_id" }
    )
    .select("id")
    .single();

  if (attendanceError || !attendance) throw attendanceError ?? new Error("Unable to save attendance for review.");

  if (body.photo_storage_path) {
    const evidenceType = body.mode === "time_in" ? "time_in_photo" : "time_out_photo";
    const { data: existingEvidence, error: evidenceLookupError } = await client
      .from("attendance_evidence")
      .select("id")
      .eq("attendance_session_id", attendance.id)
      .eq("evidence_type", evidenceType)
      .eq("storage_path", body.photo_storage_path)
      .maybeSingle();

    if (evidenceLookupError) throw evidenceLookupError;
    if (!existingEvidence) {
      const { error: evidenceError } = await client.from("attendance_evidence").insert({
        attendance_session_id: attendance.id,
        evidence_type: evidenceType,
        storage_path: body.photo_storage_path,
        photo_hash: body.photo_hash ?? null,
        metadata: {
          latitude: body.latitude,
          longitude: body.longitude,
          accuracy_meters: body.accuracy_meters,
          device_timestamp: body.device_timestamp,
          fallback_reason: verificationError
        }
      });
      if (evidenceError) throw evidenceError;
    }
  }

  return jsonResponse({
    accepted: false,
    status: "pending_verification",
    distance_meters: null,
    verification_reason: "Attendance was saved for administrator review because automatic verification could not finish.",
    suspicious_flags: ["verification_error"]
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client } = await getAuthenticatedUser(req);
    const body = (await req.json()) as AttendancePayload;
    validatePayload(body);

    const { data: student, error: studentError } = await client
      .from("student_profiles")
      .select("id,is_active")
      .eq("user_id", user.id)
      .single();

    if (studentError || !student?.is_active) {
      return jsonResponse({ error: "Active student profile not found." }, 403);
    }

    const { data: device, error: deviceError } = await client
      .from("devices")
      .select("id,is_active")
      .eq("id", body.device_id)
      .eq("student_id", student.id)
      .single();

    if (deviceError || !device?.is_active) {
      return jsonResponse(
        {
          accepted: false,
          status: "pending_verification",
          distance_meters: null,
          verification_reason: "Device is not registered for this student.",
          suspicious_flags: ["device_mismatch"]
        },
        200
      );
    }

    const { data, error } = await client.rpc("verify_attendance_submission", {
      p_student_id: student.id,
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
      console.error("verify_attendance_submission failed", error);
      return await saveForAdminReview(client, student.id, body, error.message);
    }

    return jsonResponse(data);
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
