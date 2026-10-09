import type { Event } from "@attendance/types";
import { getStoredBrowserIdentity, hashBrowserIdentity } from "../browser-device";
import type { BrowserLocation } from "../attendance/geolocation";
import type { CapturedAttendancePhoto } from "@/components/student/attendance/CameraCapture";
import type { LogicalAttendanceAttempt } from "../attendance/workflow";
import { putOfflineAttendance, queueRecordId } from "./db";
import type { OfflineAttendanceRecord } from "./types";

export async function currentBrowserFingerprintHash() {
  const identity = getStoredBrowserIdentity();
  if (!identity) throw new Error("Register this browser online before saving offline attendance.");
  return hashBrowserIdentity(identity);
}

export async function enqueueOfflineAttendance(input: {
  ownerId: string;
  event: Event;
  logical: LogicalAttendanceAttempt;
  location: BrowserLocation;
  qrToken: string | null;
  photo: CapturedAttendancePhoto | null;
  photoStoragePath: string | null;
  capturedOffline: boolean;
  lastError?: string | null | undefined;
}) {
  const now = new Date().toISOString();
  const browserFingerprintHash = await currentBrowserFingerprintHash();
  const record: OfflineAttendanceRecord = {
    id: queueRecordId(input.ownerId, input.logical.localId),
    ownerId: input.ownerId,
    eventId: input.event.id,
    eventTitle: input.event.title,
    mode: input.logical.mode,
    localId: input.logical.localId,
    idempotencyKey: input.logical.idempotencyKey,
    payload: {
      local_id: input.logical.localId,
      event_id: input.event.id,
      mode: input.logical.mode,
      device_timestamp: input.location.capturedAt,
      latitude: input.location.latitude,
      longitude: input.location.longitude,
      accuracy_meters: input.location.accuracy,
      ...(input.photoStoragePath ? { photo_storage_path: input.photoStoragePath } : {}),
      ...(input.photo?.hash ? { photo_hash: input.photo.hash } : {}),
      ...(input.qrToken ? { qr_token: input.qrToken } : {}),
      idempotency_key: input.logical.idempotencyKey,
      is_offline_submission: input.capturedOffline
    },
    browserFingerprintHash,
    ...(input.photo?.blob ? { evidenceBlob: input.photo.blob, evidenceMimeType: "image/jpeg" as const } : {}),
    ...(input.photoStoragePath ? { evidenceStoragePath: input.photoStoragePath } : {}),
    state: "queued",
    attemptCount: 0,
    automaticRetryCount: 0,
    nextAttemptAt: null,
    lastError: input.lastError ?? null,
    authoritativeResult: null,
    capturedOffline: input.capturedOffline,
    createdAt: now,
    updatedAt: now
  };
  await putOfflineAttendance(record);
  return record;
}
