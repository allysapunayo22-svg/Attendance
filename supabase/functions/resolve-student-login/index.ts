import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

function normalizeStudentId(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const studentId = normalizeStudentId(body.identifier);

    if (!studentId) {
      return jsonResponse({ error: "Student ID is required." }, 400);
    }

    const client = createServiceClient();
    const { data, error } = await client
      .from("student_profiles")
      .select("email,is_active")
      .eq("student_id", studentId)
      .maybeSingle();

    if (error) {
      return jsonResponse({ error: error.message }, 400);
    }

    if (!data?.email || !data.is_active) {
      const { data: request } = await client
        .from("student_registration_requests")
        .select("status, reason, school_email, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (request?.status === "submitted") {
        return jsonResponse({
          error: `Your registration was received, but your school email is not confirmed yet. Check ${request.school_email} for the Supabase confirmation email.`
        });
      }

      if (request?.status === "needs_admin_review") {
        return jsonResponse({
          error: request.reason ?? "Your registration needs admin review before you can log in."
        });
      }

      if (request?.status === "rejected") {
        return jsonResponse({
          error: request.reason ?? "Your registration was rejected. Check your student ID and school email or contact the CBEA administrator."
        });
      }

      if (request?.status === "approved") {
        return jsonResponse({
          error: "Your registration was approved, but no active student profile was found. Contact the CBEA administrator."
        });
      }

      return jsonResponse({
        error: "No active CSU Gonzaga CBEA account was found for this student ID. Import the student into the approved roster, then register and confirm the school email."
      });
    }

    return jsonResponse({ email: data.email });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unable to resolve student ID." }, 500);
  }
});
