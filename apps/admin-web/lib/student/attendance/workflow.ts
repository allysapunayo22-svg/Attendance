import type { AttendanceSubmission, Event, VerificationResult } from "@attendance/types";
import type { StudentAttendanceRecord } from "../types";

export type AttendanceMode = "time_in" | "time_out";
export type AttendanceActionState = "check_in" | "check_out" | "completed" | "pending" | "unavailable";

export interface AttendanceAction {
  state: AttendanceActionState;
  mode: AttendanceMode | null;
  title: string;
  description: string;
}

export interface LogicalAttendanceAttempt {
  localId: string;
  idempotencyKey: string;
  mode: AttendanceMode;
}

export class AttendanceTransportError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
    this.name = "AttendanceTransportError";
  }
}

interface AttendanceClient {
  auth: {
    getUser(): PromiseLike<{ data: { user: { id: string } | null }; error: { message?: string } | null }>;
  };
  functions: {
    invoke(name: string, options: { body: AttendanceSubmission; signal?: AbortSignal }): PromiseLike<{ data: unknown; error: unknown }>;
  };
  storage: {
    from(bucket: string): {
      upload(path: string, file: Blob, options: { contentType: string; upsert: boolean }): PromiseLike<{ data: unknown; error: unknown }>;
    };
  };
}

function attendanceWindow(event: Event, mode: AttendanceMode) {
  if (!event.schedule) return null;
  if (mode === "time_in") {
    return {
      opens: Date.parse(event.schedule.check_in_opens_at),
      closes: Math.max(Date.parse(event.schedule.check_in_closes_at), Date.parse(event.schedule.late_ends_at ?? event.schedule.check_in_closes_at))
    };
  }
  if (!event.schedule.check_out_opens_at || !event.schedule.check_out_closes_at) return null;
  return { opens: Date.parse(event.schedule.check_out_opens_at), closes: Date.parse(event.schedule.check_out_closes_at) };
}

function outsideWindow(event: Event, mode: AttendanceMode, now: number) {
  const window = attendanceWindow(event, mode);
  return !window || !Number.isFinite(window.opens) || !Number.isFinite(window.closes) || now < window.opens || now > window.closes;
}

export function deriveAttendanceAction(event: Event, attendance: StudentAttendanceRecord | null, now = Date.now()): AttendanceAction {
  if (!event.schedule || !event.location || !["published", "ongoing"].includes(event.status)) {
    return { state: "unavailable", mode: null, title: "Attendance unavailable", description: "This event is not currently configured for attendance." };
  }

  if (attendance?.time_out_verified_timestamp || attendance?.status === "completed") {
    return { state: "completed", mode: null, title: "Attendance completed", description: "Your check-in and check-out are already recorded." };
  }

  if (attendance && ["excused", "missed"].includes(attendance.status)) {
    return { state: "unavailable", mode: null, title: "Attendance unavailable", description: `This attendance record is marked ${attendance.status}.` };
  }

  const acceptedTimeIn = Boolean(
    attendance?.time_in_verified_timestamp ||
    attendance?.status === "verified" && attendance.reviewed_at
  );

  if (attendance?.status === "pending_verification" && !acceptedTimeIn) {
    return { state: "pending", mode: null, title: "Attendance pending review", description: "Your attendance evidence is waiting for review." };
  }

  if (acceptedTimeIn) {
    const acceptedAt = Date.parse(attendance?.time_in_server_timestamp ?? attendance?.time_in_verified_timestamp ?? "");
    if (!event.early_time_out_allowed
      && event.minimum_attendance_minutes > 0
      && Number.isFinite(acceptedAt)
      && now - acceptedAt < event.minimum_attendance_minutes * 60_000) {
      const minutesRemaining = Math.max(1, Math.ceil((event.minimum_attendance_minutes * 60_000 - (now - acceptedAt)) / 60_000));
      return { state: "unavailable", mode: "time_out", title: "Check-out unavailable", description: `Minimum attendance time has not been reached. About ${minutesRemaining} minute${minutesRemaining === 1 ? "" : "s"} remaining.` };
    }
    if (outsideWindow(event, "time_out", now)) {
      return { state: "unavailable", mode: "time_out", title: "Check-out unavailable", description: "The event check-out window is not currently open." };
    }
    return { state: "check_out", mode: "time_out", title: "Ready to check out", description: "Capture current evidence to complete your attendance." };
  }

  if (outsideWindow(event, "time_in", now)) {
    return { state: "unavailable", mode: "time_in", title: "Check-in unavailable", description: "The event check-in window is not currently open." };
  }

  return { state: "check_in", mode: "time_in", title: "Ready to check in", description: "Capture current location and required evidence to record attendance." };
}

export function createLogicalAttempt(eventId: string, mode: AttendanceMode, uuid = crypto.randomUUID()): LogicalAttendanceAttempt {
  const compactUuid = uuid.replaceAll("-", "");
  const localId = `${mode}_${compactUuid}`;
  return { localId, mode, idempotencyKey: `${eventId}:${mode}:${localId}` };
}

export function validateQrToken(token: string, eventId: string, now = Date.now()) {
  const parts = token.trim().split(":");
  if (parts.length < 3 || parts[0] !== eventId) return { valid: false, reason: "This QR code is not valid for this event." };
  const expiresAt = Number(parts[1]) * 1000;
  if (!Number.isFinite(expiresAt)) return { valid: false, reason: "This QR code is not valid for this event." };
  if (expiresAt < now) return { valid: false, reason: "This QR code has expired. Scan the latest event code." };
  return { valid: true, expiresAt, reason: "QR code ready." };
}

export function attendanceEvidencePath(userId: string, eventId: string, localId: string) {
  return `${userId}/${eventId}/${localId}.jpg`;
}

export async function authenticatedUserId(client: AttendanceClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new AttendanceTransportError("Your login session expired. Sign in again before recording attendance.", false);
  return data.user.id;
}

export async function uploadAttendanceEvidence(client: AttendanceClient, path: string, photo: Blob) {
  if (photo.type !== "image/jpeg" || photo.size <= 0 || photo.size > 5 * 1024 * 1024) {
    throw new AttendanceTransportError("The attendance photo is invalid or exceeds the 5 MB limit.", false);
  }
  const { error } = await client.storage.from("attendance-evidence").upload(path, photo, { contentType: "image/jpeg", upsert: false });
  if (error) throw new AttendanceTransportError(errorMessage(error, "Unable to upload attendance evidence."), true);
  return path;
}

async function functionErrorDetails(error: unknown) {
  const context = (error as { context?: { clone?: () => { json?: () => Promise<unknown> }; json?: () => Promise<unknown> } })?.context;
  try {
    const reader = context?.clone?.() ?? context;
    const body = await reader?.json?.();
    return body && typeof body === "object" ? body as { error?: unknown; message?: unknown; retryable?: unknown } : null;
  } catch {
    return null;
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : typeof (error as { message?: unknown })?.message === "string" ? String((error as { message: string }).message) : fallback;
}

export async function submitAttendanceAttempt(client: AttendanceClient, submission: AttendanceSubmission, signal?: AbortSignal) {
  const { data, error } = await client.functions.invoke("submit-attendance", { body: submission, ...(signal ? { signal } : {}) });
  if (error) {
    const details = await functionErrorDetails(error);
    const message = typeof details?.error === "string" ? details.error : typeof details?.message === "string" ? details.message : errorMessage(error, "Attendance submission failed.");
    throw new AttendanceTransportError(message, details?.retryable === true || !/auth|session|sign in/i.test(message));
  }
  if (!data || typeof data !== "object" || typeof (data as { accepted?: unknown }).accepted !== "boolean") {
    throw new AttendanceTransportError("The attendance service returned an invalid response.", true);
  }
  return data as VerificationResult;
}

export function friendlyAttendanceReason(result: VerificationResult) {
  const reason = result.verification_reason.toLowerCase();
  if (reason.includes("device is not active")) return "This browser is no longer your active attendance device. Register it again before retrying.";
  if (reason.includes("outside the attendance zone")) return "You appear to be outside the attendance area. Move closer and try again.";
  if (reason.includes("gps accuracy")) return "Your location accuracy is too low. Move to an open area and refresh your location.";
  if (reason.includes("qr token")) return "The event QR code is invalid or expired. Scan the latest code and start a new attempt.";
  if (reason.includes("photo")) return "The required attendance photo could not be verified. Capture a new photo and try again.";
  if (reason.includes("outside the allowed") || reason.includes("window")) return "The attendance window is not currently open.";
  if (reason.includes("already exists") || reason.includes("already recorded")) return "This attendance action has already been recorded.";
  if (reason.includes("time-in is required") || reason.includes("accepted time-in")) return "A valid check-in is required before check-out.";
  if (reason.includes("timestamp")) return "The captured attendance time is no longer fresh. Start a new attempt.";
  return result.verification_reason;
}
