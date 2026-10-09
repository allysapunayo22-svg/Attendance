import type { AttendanceSubmission, VerificationResult } from "@attendance/types";
import type { OfflineAttendanceRecord } from "./types";

export const MAX_AUTOMATIC_RETRIES = 6;
export const MAX_BACKOFF_MS = 5 * 60_000;
export type SyncOutcome = "synced" | "rejected" | "blocked" | "retrying" | "authenticationRequired" | "skipped";

function attendanceEvidencePath(userId: string, eventId: string, localId: string) {
  return `${userId}/${eventId}/${localId}.jpg`;
}

export interface OfflineSyncDependencies {
  now(): number;
  authenticatedOwnerId(): Promise<string | null>;
  isCancelled(): boolean;
  currentFingerprint(): Promise<string>;
  resolveDevice(): Promise<{ active: boolean; deviceId: string | null }>;
  uploadEvidence(path: string, blob: Blob): Promise<void>;
  removeEvidence(path: string): Promise<boolean>;
  submit(payload: AttendanceSubmission, signal?: AbortSignal): Promise<VerificationResult>;
  signal?: AbortSignal;
  update(localId: string, updates: Partial<OfflineAttendanceRecord>): Promise<unknown>;
}

interface SyncLockManager {
  request<T>(name: string, options: { mode: "exclusive"; ifAvailable: true }, callback: (lock: unknown | null) => Promise<T>): Promise<T>;
}

export async function withOwnerSyncLock<T>(ownerId: string, run: () => Promise<T>, lockManager?: SyncLockManager): Promise<T | null> {
  const availableLocks = lockManager ?? (typeof navigator !== "undefined" ? navigator.locks as SyncLockManager : undefined);
  if (!availableLocks) throw new Error("This browser cannot safely coordinate attendance sync across tabs.");
  return availableLocks.request(`clickin:attendance-sync:${ownerId}`, { mode: "exclusive", ifAvailable: true }, async (lock) => lock ? run() : null);
}

export function backoffMilliseconds(attempt: number) {
  return Math.min(MAX_BACKOFF_MS, 5_000 * 2 ** Math.max(0, attempt - 1));
}

export function recordIsDue(record: OfflineAttendanceRecord, manual: boolean, now = Date.now()) {
  if (!["queued", "uploading_evidence", "submitting", "retry_wait", "authentication_required", "blocked_device"].includes(record.state)) return false;
  if (manual) return true;
  if (record.state === "authentication_required" || record.state === "blocked_device") return false;
  if (record.automaticRetryCount >= MAX_AUTOMATIC_RETRIES) return false;
  return !record.nextAttemptAt || Date.parse(record.nextAttemptAt) <= now;
}

export function nextAutomaticRetryAt(records: OfflineAttendanceRecord[], now = Date.now()) {
  const dueTimes = records.flatMap((record) => {
    if (record.automaticRetryCount >= MAX_AUTOMATIC_RETRIES) return [];
    if (["queued", "uploading_evidence", "submitting"].includes(record.state)) return [now];
    if (record.state !== "retry_wait" || !record.nextAttemptAt) return [];
    const parsed = Date.parse(record.nextAttemptAt);
    return Number.isFinite(parsed) ? [Math.max(now, parsed)] : [now];
  });
  return dueTimes.length ? Math.min(...dueTimes) : null;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Attendance synchronization failed.";
}

async function scheduleRetry(record: OfflineAttendanceRecord, manual: boolean, error: unknown, dependencies: OfflineSyncDependencies) {
  const automaticRetryCount = record.automaticRetryCount + (manual ? 0 : 1);
  const attemptCount = record.attemptCount + 1;
  const automaticPaused = automaticRetryCount >= MAX_AUTOMATIC_RETRIES;
  await dependencies.update(record.localId, {
    state: "retry_wait",
    attemptCount,
    automaticRetryCount,
    nextAttemptAt: automaticPaused ? null : new Date(dependencies.now() + backoffMilliseconds(attemptCount)).toISOString(),
    lastError: automaticPaused ? `${errorMessage(error)} Automatic retries are paused; use Sync now to retry.` : errorMessage(error)
  });
}

async function pauseForAuthentication(record: OfflineAttendanceRecord, dependencies: OfflineSyncDependencies) {
  await dependencies.update(record.localId, {
    state: "authentication_required",
    nextAttemptAt: null,
    lastError: "Sign in again with the same account to resume this saved attendance."
  });
  return "authenticationRequired" as const;
}

async function ownerIsStillAuthenticated(record: OfflineAttendanceRecord, ownerId: string, dependencies: OfflineSyncDependencies) {
  if (record.ownerId !== ownerId || dependencies.isCancelled()) return false;
  const authenticatedOwnerId = await dependencies.authenticatedOwnerId();
  return !dependencies.isCancelled() && authenticatedOwnerId === ownerId;
}

async function ownershipInterruption(record: OfflineAttendanceRecord, ownerId: string, manual: boolean, dependencies: OfflineSyncDependencies): Promise<SyncOutcome | null> {
  try {
    return await ownerIsStillAuthenticated(record, ownerId, dependencies)
      ? null
      : await pauseForAuthentication(record, dependencies);
  } catch (error) {
    await scheduleRetry(record, manual, error, dependencies);
    return "retrying";
  }
}

function isAuthenticationFailure(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return error instanceof Error
    && (error as Error & { retryable?: boolean }).retryable === false
    && /auth|session|sign in|login/i.test(message);
}

export async function processOfflineRecord(record: OfflineAttendanceRecord, ownerId: string, manual: boolean, dependencies: OfflineSyncDependencies): Promise<SyncOutcome> {
  if (record.ownerId !== ownerId) return "skipped";
  const initialInterruption = await ownershipInterruption(record, ownerId, manual, dependencies);
  if (initialInterruption) return initialInterruption;

  const expectedEvidencePath = attendanceEvidencePath(ownerId, record.eventId, record.localId);
  if (record.evidenceStoragePath && record.evidenceStoragePath !== expectedEvidencePath) {
    await dependencies.update(record.localId, {
      state: "blocked_integrity",
      nextAttemptAt: null,
      lastError: "The saved evidence path does not belong to this attendance item."
    });
    return "blocked";
  }

  const currentFingerprint = await dependencies.currentFingerprint();
  const fingerprintInterruption = await ownershipInterruption(record, ownerId, manual, dependencies);
  if (fingerprintInterruption) return fingerprintInterruption;
  if (currentFingerprint !== record.browserFingerprintHash) {
    await dependencies.update(record.localId, { state: "blocked_device", lastError: "This queued attendance belongs to a different browser registration." });
    return "blocked";
  }

  let device;
  try {
    device = await dependencies.resolveDevice();
  } catch (error) {
    if (dependencies.isCancelled()) return pauseForAuthentication(record, dependencies);
    await scheduleRetry(record, manual, error, dependencies);
    return "retrying";
  }
  const deviceInterruption = await ownershipInterruption(record, ownerId, manual, dependencies);
  if (deviceInterruption) return deviceInterruption;
  if (!device.active || !device.deviceId) {
    await dependencies.update(record.localId, { state: "blocked_device", nextAttemptAt: null, lastError: "This browser is no longer the active attendance device. Register it again before syncing." });
    return "blocked";
  }

  let evidenceStoragePath = record.evidenceStoragePath;
  if (record.evidenceBlob && !evidenceStoragePath) {
    await dependencies.update(record.localId, { state: "uploading_evidence", lastError: null });
    evidenceStoragePath = expectedEvidencePath;
    try {
      await dependencies.uploadEvidence(evidenceStoragePath, record.evidenceBlob);
    } catch (error) {
      if (dependencies.isCancelled()) return pauseForAuthentication(record, dependencies);
      await scheduleRetry(record, manual, error, dependencies);
      return "retrying";
    }
    await dependencies.update(record.localId, { evidenceStoragePath, state: "submitting" });
    const uploadInterruption = await ownershipInterruption(record, ownerId, manual, dependencies);
    if (uploadInterruption) return uploadInterruption;
  } else {
    await dependencies.update(record.localId, { state: "submitting", lastError: null });
  }

  try {
    const submitInterruption = await ownershipInterruption(record, ownerId, manual, dependencies);
    if (submitInterruption) return submitInterruption;
    const result = await dependencies.submit({ ...record.payload, ...(evidenceStoragePath ? { photo_storage_path: evidenceStoragePath } : {}), device_id: device.deviceId }, dependencies.signal);
    if (result.accepted) {
      await dependencies.update(record.localId, { state: "synced", authoritativeResult: result, evidenceBlob: undefined, evidenceStoragePath, nextAttemptAt: null, lastError: null });
      return "synced";
    }
    const evidenceOrphaned = evidenceStoragePath ? !(await dependencies.removeEvidence(evidenceStoragePath)) : false;
    await dependencies.update(record.localId, { state: "rejected", authoritativeResult: result, evidenceBlob: undefined, evidenceStoragePath, evidenceOrphaned, nextAttemptAt: null, lastError: result.verification_reason });
    return "rejected";
  } catch (error) {
    if (dependencies.isCancelled() || isAuthenticationFailure(error)) return pauseForAuthentication(record, dependencies);
    try {
      if (!(await ownerIsStillAuthenticated(record, ownerId, dependencies))) return pauseForAuthentication(record, dependencies);
    } catch {
      // A failed ownership recheck after a transport failure is treated as the
      // same retryable infrastructure outage, preserving the queue and Blob.
    }
    if (error instanceof Error && (error as Error & { retryable?: boolean }).retryable === false) {
      await dependencies.update(record.localId, { state: "rejected", nextAttemptAt: null, lastError: error.message });
      return "rejected";
    }
    await scheduleRetry({ ...record, ...(evidenceStoragePath ? { evidenceStoragePath } : {}) }, manual, error, dependencies);
    return "retrying";
  }
}

export function createSingleFlightSync<T>(run: () => Promise<T>) {
  let active: Promise<T> | null = null;
  return () => {
    if (active) return active;
    active = run().finally(() => { active = null; });
    return active;
  };
}
