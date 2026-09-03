import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";

function normalizeStudentId(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, "").toUpperCase();
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const studentId = normalizeStudentId(body.studentId);
    const schoolEmail = normalizeEmail(body.schoolEmail);

    if (!studentId || !schoolEmail) {
      return jsonResponse({ eligible: false, error: "Student ID and school email are required." });
    }

    const client = createServiceClient();
    const { data, error } = await client
      .from("approved_student_roster")
      .select("student_id, school_email, full_name, department_code, year_level, status, claimed_by_user_id")
      .eq("student_id", studentId)
      .eq("school_email", schoolEmail)
      .maybeSingle();

    if (error) {
      return jsonResponse({ eligible: false, error: error.message }, 400);
    }

    if (!data || data.department_code !== "CBEA" || data.status !== "eligible" || data.claimed_by_user_id) {
      return jsonResponse({
        eligible: false,
        error: "This student ID and school email are not eligible for CSU Gonzaga CBEA registration. Check that the CSV roster was imported and that the email exactly matches."
      });
    }

    return jsonResponse({
      eligible: true,
      studentId: data.student_id,
      schoolEmail: data.school_email,
      fullName: data.full_name,
      yearLevel: data.year_level
    });
  } catch (error) {
    return jsonResponse({ eligible: false, error: error instanceof Error ? error.message : "Unable to verify registration." }, 500);
  }
});
