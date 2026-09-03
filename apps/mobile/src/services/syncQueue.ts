import { Platform } from "react-native";
import { submitAttendance, uploadAttendancePhoto } from "@attendance/api-client";
import { File } from "expo-file-system";
import { supabase } from "./supabase";
import { getPendingAttendanceRecords, updateAttendanceSyncState } from "../repositories/attendanceRepository";

async function getPhotoBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return res.arrayBuffer();
  }
  const photo = new File(uri);
  return photo.arrayBuffer();
}

const PHOTO_BUCKET = "attendance-evidence";

function isExistingStorageObjectError(error: unknown) {
  const storageError = error as { message?: unknown; status?: unknown; statusCode?: unknown };
  const message = typeof storageError?.message === "string" ? storageError.message : "";
  return Number(storageError?.status) === 409 || Number(storageError?.statusCode) === 409 || /already exists|duplicate/i.test(message);
}

async function getFreshSession() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;

  let session = sessionData.session;
  if (!session) return null;

  const expiresSoon = !session.expires_at || session.expires_at * 1000 <= Date.now() + 60_000;
  if (expiresSoon) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error("Your login session expired. Log out, then log in again before retrying the upload.");
    }
    session = refreshed.session;
  }

  return session;
}

export async function syncPendingAttendance() {
  const session = await getFreshSession();
  const userId = session?.user.id;
  if (!userId) return { synced: 0, failed: 0 };

  const pending = await getPendingAttendanceRecords();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await updateAttendanceSyncState(record.local_id, "uploading");

      const { data: currentEvent, error: eventError } = await supabase
        .from("events")
        .select("id")
        .eq("id", record.event_id)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!currentEvent) {
        await updateAttendanceSyncState(record.local_id, "requires_review", {
          status: "rejected",
          lastError: "This event was deleted or is no longer assigned to your account.",
          serverPayload: {
            accepted: false,
            status: "rejected",
            verification_reason: "This event was deleted or is no longer assigned to your account.",
            suspicious_flags: []
          }
        });
        synced += 1;
        continue;
      }

      let photoStoragePath = record.photo_storage_path ?? undefined;

      if (!photoStoragePath && record.photo_local_uri) {
        const photoBytes = await getPhotoBytes(record.photo_local_uri);
        photoStoragePath = `${userId}/${record.event_id}/${record.local_id}.jpg`;
        try {
          await uploadAttendancePhoto(supabase, PHOTO_BUCKET, photoStoragePath, photoBytes, "image/jpeg");
        } catch (error) {
          if (!isExistingStorageObjectError(error)) throw error;
        }

        // Persist the remote path before attendance submission so a later retry
        // does not attempt to create the same Storage object again.
        await updateAttendanceSyncState(record.local_id, "uploading", { photoStoragePath });
      }

      const result = await submitAttendance(supabase, {
        local_id: record.local_id,
        event_id: record.event_id,
        mode: record.mode,
        device_timestamp: record.device_timestamp,
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy_meters: record.accuracy_meters,
        photo_storage_path: photoStoragePath,
        photo_hash: record.photo_hash ?? undefined,
        qr_token: record.qr_token ?? undefined,
        device_id: record.device_id,
        idempotency_key: record.idempotency_key,
        is_offline_submission: Boolean(record.is_offline_submission)
      }, session.access_token);

      await updateAttendanceSyncState(record.local_id, result.accepted ? "verified" : "requires_review", {
        status: result.status,
        photoStoragePath,
        serverPayload: result
      });
      synced += 1;
    } catch (error) {
      failed += 1;
      await updateAttendanceSyncState(record.local_id, "failed", {
        retryCount: record.retry_count + 1,
        lastError: error instanceof Error ? error.message : "Sync failed."
      });
    }
  }

  return { synced, failed };
}
