import { create } from "zustand";
import type { StudentProfile } from "@attendance/types";
import type { RegisterInput } from "@attendance/validation";
import { supabase } from "../services/supabase";
import { initDatabase } from "../database/client";
import { registerDevice } from "../services/device";
import { registerPushToken } from "../services/notifications";

interface AuthState {
  loading: boolean;
  student: StudentProfile | null;
  deviceId: string | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<"signed_in" | "email_confirmation_required">;
  logout: () => Promise<void>;
}

function normalizeStudentId(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

async function getFunctionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Request failed.";
  const context = (error as { context?: { clone?: () => { json?: () => Promise<unknown>; text?: () => Promise<string> }; json?: () => Promise<unknown>; text?: () => Promise<string> } }).context;

  try {
    const reader = context?.clone?.() ?? context;
    const parsed = await reader?.json?.();
    if (parsed && typeof parsed === "object") {
      const body = parsed as { error?: unknown; message?: unknown };
      if (typeof body.error === "string") return body.error;
      if (typeof body.message === "string") return body.message;
    }
  } catch {
    try {
      const reader = context?.clone?.() ?? context;
      const text = await reader?.text?.();
      if (text) return text;
    } catch {
      return fallback;
    }
  }

  return fallback;
}

async function loadStudentProfile(userId: string) {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    const { data: request } = await supabase
      .from("student_registration_requests")
      .select("status, reason, school_email")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (request?.status === "submitted") {
      throw new Error(`Your registration was received, but your school email is not confirmed yet. Check ${request.school_email} for the confirmation email.`);
    }

    if (request?.status === "needs_admin_review") {
      throw new Error(request.reason ?? "Your registration needs admin review before you can log in.");
    }

    if (request?.status === "rejected") {
      throw new Error(request.reason ?? "Your registration was rejected. Contact the CBEA administrator.");
    }

    if (request?.status === "approved") {
      throw new Error("Your registration was approved, but no active student profile was found. Contact the CBEA administrator.");
    }

    throw new Error("No approved CSU Gonzaga CBEA student profile was found for this account.");
  }
  const student = data as StudentProfile;
  if (!student.is_active) {
    throw new Error("Your student account is inactive. Contact the CBEA administrator.");
  }
  return student;
}

async function resolveLoginEmail(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const { data, error } = await supabase.functions.invoke<{ email?: string; error?: string }>("resolve-student-login", {
    body: { identifier: normalizeStudentId(trimmed) }
  });

  if (error) throw new Error(data?.error ?? (await getFunctionErrorMessage(error)));
  if (!data?.email) throw new Error("No active account was found for this student ID.");
  return data.email;
}

async function assertRegistrationEligible(values: RegisterInput) {
  const { data, error } = await supabase.functions.invoke<{ eligible: boolean; fullName?: string; error?: string }>("verify-student-registration", {
    body: {
      studentId: normalizeStudentId(values.studentId),
      schoolEmail: values.schoolEmail.trim().toLowerCase()
    }
  });

  if (error) throw new Error(data?.error ?? (await getFunctionErrorMessage(error)));
  if (!data?.eligible) throw new Error(data?.error ?? "This student is not eligible for CSU Gonzaga CBEA registration.");
  return data;
}

export const useAuthStore = create<AuthState>((set) => ({
  loading: true,
  student: null,
  deviceId: null,
  error: null,
  bootstrap: async () => {
    try {
      await initDatabase();
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        set({ loading: false, student: null, deviceId: null });
        return;
      }

      const student = await loadStudentProfile(user.id);
      let deviceId: string | null = null;
      try {
        deviceId = await registerDevice(student.id);
      } catch (devErr) {
        console.warn("Device registration fallback in bootstrap:", devErr);
      }
      void registerPushToken(user.id).catch(() => null);
      set({ loading: false, student, deviceId, error: null });
    } catch (error) {
      await supabase.auth.signOut().catch(() => null);
      set({
        loading: false,
        student: null,
        deviceId: null,
        error: error instanceof Error ? error.message : "Unable to initialize session."
      });
    }
  },
  login: async (identifier, password) => {
    set({ loading: true, error: null });
    try {
      const email = await resolveLoginEmail(identifier);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login did not return a user session.");

      const student = await loadStudentProfile(data.user.id);
      let deviceId: string | null = null;
      try {
        deviceId = await registerDevice(student.id);
      } catch (devErr) {
        console.warn("Device registration fallback in login:", devErr);
      }
      void registerPushToken(data.user.id).catch(() => null);
      set({ loading: false, student, deviceId, error: null });
    } catch (error) {
      await supabase.auth.signOut().catch(() => null);
      set({
        loading: false,
        student: null,
        deviceId: null,
        error: error instanceof Error ? error.message : "Login failed."
      });
      throw error;
    }
  },
  register: async (values) => {
    set({ loading: true, error: null });
    try {
      const studentId = normalizeStudentId(values.studentId);
      const email = values.schoolEmail.trim().toLowerCase();
      const eligibility = await assertRegistrationEligible(values);
      const fullName = eligibility.fullName ?? values.fullName.trim();

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            student_id: studentId,
            full_name: fullName,
            department_code: "CBEA"
          }
        }
      });

      if (error) throw error;

      if (data.session && data.user) {
        const student = await loadStudentProfile(data.user.id);
        const deviceId = await registerDevice(student.id);
        void registerPushToken(data.user.id).catch(() => null);
        set({ loading: false, student, deviceId, error: null });
        return "signed_in";
      }

      await supabase.auth.signOut().catch(() => null);
      set({ loading: false, student: null, deviceId: null, error: null });
      return "email_confirmation_required";
    } catch (error) {
      await supabase.auth.signOut().catch(() => null);
      set({
        loading: false,
        student: null,
        deviceId: null,
        error: error instanceof Error ? error.message : "Registration failed."
      });
      throw error;
    }
  },
  logout: async () => {
    await supabase.auth.signOut();
    set({ loading: false, student: null, deviceId: null, error: null });
  }
}));
