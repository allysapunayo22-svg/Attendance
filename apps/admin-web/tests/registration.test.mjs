import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { registerSchema } from "@attendance/validation";
import { normalizeStudentId, registrationRedirectUrl } from "../lib/auth/registration.ts";

test("web registration uses the shared validation and a fixed same-origin callback", () => {
  assert.equal(normalizeStudentId(" 2026- 001 "), "2026-001");
  assert.equal(registrationRedirectUrl("https://clickin.example.edu"), "https://clickin.example.edu/auth/callback?type=signup");
  assert.equal(registerSchema.safeParse({ studentId: "2026-001", fullName: "Test Student", schoolEmail: "student@example.edu", password: "secure-pass", confirmPassword: "secure-pass", acceptPrivacy: true }).success, true);
  assert.equal(registerSchema.safeParse({ studentId: "2026-001", fullName: "Test Student", schoolEmail: "student@example.edu", password: "secure-pass", confirmPassword: "different-pass", acceptPrivacy: true }).success, false);
});

test("registration verifies the approved roster before creating an auth identity", async () => {
  const source = await readFile(new URL("../app/register/page.tsx", import.meta.url), "utf8");
  const verification = source.indexOf('"verify-student-registration"');
  const signup = source.indexOf("supabase.auth.signUp");
  assert.equal(verification >= 0, true);
  assert.equal(signup > verification, true);
  assert.match(source, /student_id: studentId/);
  assert.match(source, /department_code: "CBEA"/);
});

test("signup callback resolves only the confirmed student's trusted profile", async () => {
  const source = await readFile(new URL("../app/auth/callback/auth-callback.tsx", import.meta.url), "utf8");
  assert.match(source, /type === "signup"/);
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /student_profiles/);
  assert.match(source, /student_registration_requests/);
  assert.doesNotMatch(source, /searchParams\.get\(["']next/);
});

test("login exposes registration and the privacy notice route exists", async () => {
  const [login, privacy] = await Promise.all([
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8")
  ]);
  assert.match(login, /href="\/register"/);
  assert.match(privacy, /Attendance privacy notice/);
});
