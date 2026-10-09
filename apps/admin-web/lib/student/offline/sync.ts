import { supabase } from "@/lib/supabase";
import { canBeginAttendance, resolveCurrentBrowserDevice } from "../browser-device";
import { submitAttendanceAttempt } from "../attendance/workflow";
import { currentBrowserFingerprintHash } from "./queue";
import { getOfflineAttendanceForOwner, updateOfflineAttendance } from "./db";
import { localSessionOwnerId } from "./session";
import { MAX_AUTOMATIC_RETRIES, processOfflineRecord, recordIsDue, withOwnerSyncLock } from "./sync-core";

let syncTail: Promise<void> = Promise.resolve();
let syncGeneration = 0;
const activeControllers = new Set<AbortController>();

export interface SyncSummary {
  synced: number;
  rejected: number;
  blocked: number;
  retrying: number;
  authenticationRequired: number;
  skipped: number;
  busy: boolean;
}

export function cancelOfflineSync() {
  syncGeneration += 1;
  activeControllers.forEach((controller) => controller.abort());
}

function isExistingObjectError(error: unknown) {
  const value = error as { status?: unknown; statusCode?: unknown; message?: unknown };
  return Number(value?.status) === 409 || Number(value?.statusCode) === 409 || /already exists|duplicate/i.test(String(value?.message ?? ""));
}

function emptySummary(): SyncSummary {
  return { synced: 0, rejected: 0, blocked: 0, retrying: 0, authenticationRequired: 0, skipped: 0, busy: false };
}

async function authenticatedOwnerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    const status = Number((error as { status?: unknown }).status);
    if ([401, 403].includes(status) || /session.*missing|invalid.*jwt|not authenticated/i.test(error.message)) return null;
    throw error;
  }
  return data.user?.id ?? null;
}

async function runSync(ownerId: string, manual: boolean): Promise<SyncSummary> {
  const generation = syncGeneration;
  const records = await getOfflineAttendanceForOwner(ownerId);
  const due = records.filter((record) => recordIsDue(record, manual));
  const summary = emptySummary();
  for (const record of due) {
    if (generation !== syncGeneration) break;
    const controller = new AbortController();
    activeControllers.add(controller);
    try {
      const outcome = await processOfflineRecord(record, ownerId, manual, {
        now: () => Date.now(),
        authenticatedOwnerId,
        isCancelled: () => generation !== syncGeneration || controller.signal.aborted,
        signal: controller.signal,
        currentFingerprint: currentBrowserFingerprintHash,
        resolveDevice: async () => {
          const device = await resolveCurrentBrowserDevice(supabase);
          return { active: canBeginAttendance(device), deviceId: device.deviceId };
        },
        uploadEvidence: async (path, blob) => {
          const { error } = await supabase.storage.from("attendance-evidence").upload(path, blob, { contentType: "image/jpeg", upsert: false });
          if (error && !isExistingObjectError(error)) throw error;
        },
        removeEvidence: async (path) => {
          const { data, error } = await supabase.storage.from("attendance-evidence").remove([path]);
          return !error && Array.isArray(data) && data.length === 1;
        },
        submit: (payload, signal) => submitAttendanceAttempt(supabase, payload, signal),
        update: (localId, updates) => updateOfflineAttendance(ownerId, localId, updates)
      });
      summary[outcome] += 1;
    } finally {
      activeControllers.delete(controller);
    }
  }
  return summary;
}

export function syncOfflineAttendance(options: { manual?: boolean; ownerId?: string } = {}) {
  const task = syncTail.catch(() => undefined).then(async () => {
    const localOwnerId = await localSessionOwnerId();
    if (localOwnerId && options.ownerId && localOwnerId !== options.ownerId) {
      throw new Error("The queued attendance belongs to another account.");
    }
    const ownerId = options.ownerId ?? localOwnerId;
    if (!ownerId) throw new Error("Sign in again to resume saved attendance.");
    const result = await withOwnerSyncLock(ownerId, () => runSync(ownerId, Boolean(options.manual)));
    return result ?? { ...emptySummary(), busy: true };
  });
  syncTail = task.then(() => undefined, () => undefined);
  return task;
}

export { MAX_AUTOMATIC_RETRIES };
