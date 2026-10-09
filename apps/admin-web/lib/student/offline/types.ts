import type { AttendanceSubmission, Event, VerificationResult } from "@attendance/types";
import type { StudentAttendanceRecord } from "../types";

export type OfflineQueueState =
  | "queued"
  | "uploading_evidence"
  | "submitting"
  | "retry_wait"
  | "authentication_required"
  | "blocked_device"
  | "blocked_integrity"
  | "rejected"
  | "synced";

export type QueuedAttendancePayload = Omit<AttendanceSubmission, "device_id" | "photo_local_uri">;

export interface OfflineAttendanceRecord {
  id: string;
  ownerId: string;
  eventId: string;
  eventTitle: string;
  mode: "time_in" | "time_out";
  localId: string;
  idempotencyKey: string;
  payload: QueuedAttendancePayload;
  browserFingerprintHash: string;
  evidenceBlob?: Blob | undefined;
  evidenceMimeType?: "image/jpeg" | undefined;
  evidenceStoragePath?: string | undefined;
  evidenceOrphaned?: boolean | undefined;
  state: OfflineQueueState;
  attemptCount: number;
  automaticRetryCount: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  authoritativeResult: VerificationResult | null;
  capturedOffline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineEventRecord {
  id: string;
  ownerId: string;
  eventId: string;
  event: Event;
  cachedAt: string;
}

export interface OfflineAttendanceCacheRecord {
  id: string;
  ownerId: string;
  attendanceId: string;
  attendance: StudentAttendanceRecord;
  cachedAt: string;
}

export const PENDING_QUEUE_STATES: OfflineQueueState[] = [
  "queued",
  "uploading_evidence",
  "submitting",
  "retry_wait",
  "authentication_required",
  "blocked_integrity",
  "blocked_device"
];
