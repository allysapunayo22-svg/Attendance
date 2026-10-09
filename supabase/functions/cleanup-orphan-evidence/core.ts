export const EVIDENCE_BUCKET = "attendance-evidence";
export const RETENTION_MILLISECONDS = 24 * 60 * 60 * 1000;
export const MAX_BATCH_SIZE = 100;
const PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 1_000;
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}";
const EVIDENCE_PATH = new RegExp(`^${UUID}/${UUID}/[A-Za-z0-9_-]{8,200}\\.jpg$`);

export type StorageEntry = {
  id?: string | null;
  name: string;
  created_at?: string | null;
};

export type CleanupAudit = {
  action: string;
  runId: string;
  path?: string;
  reason?: string;
  dryRun: boolean;
  summary?: Omit<CleanupResult, "runId" | "bucket" | "dryRun">;
};

export type CleanupDependencies = {
  now(): Date;
  runId(): string;
  list(prefix: string, offset: number, limit: number): Promise<StorageEntry[]>;
  isReferenced(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
  audit(record: CleanupAudit): Promise<void>;
};

export type CleanupOptions = { dryRun?: boolean; limit?: number };

export type CleanupResult = {
  runId: string;
  bucket: typeof EVIDENCE_BUCKET;
  dryRun: boolean;
  limit: number;
  considered: number;
  eligible: number;
  deleted: number;
  skipped: number;
  failures: number;
  truncated: boolean;
};

export function validEvidencePath(path: string) {
  return EVIDENCE_PATH.test(path);
}

export async function validCleanupSecret(received: string, expected: string) {
  if (!received || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(received)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected))
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let different = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) different |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return different === 0;
}

export function parseCleanupOptions(value: unknown): Required<CleanupOptions> {
  if (value === undefined || value === null) return { dryRun: true, limit: MAX_BATCH_SIZE };
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("A JSON object is required.");
  const record = value as Record<string, unknown>;
  const allowed = new Set(["dryRun", "limit"]);
  if (Object.keys(record).some((key) => !allowed.has(key))) throw new Error("Unsupported cleanup option.");
  if (record.dryRun !== undefined && typeof record.dryRun !== "boolean") throw new Error("dryRun must be a boolean.");
  if (record.limit !== undefined && (!Number.isInteger(record.limit) || Number(record.limit) < 1 || Number(record.limit) > MAX_BATCH_SIZE)) {
    throw new Error(`limit must be an integer from 1 to ${MAX_BATCH_SIZE}.`);
  }
  return { dryRun: record.dryRun ?? true, limit: Number(record.limit ?? MAX_BATCH_SIZE) };
}

async function auditOutcome(deps: CleanupDependencies, base: CleanupAudit, action: string, reason?: string) {
  await deps.audit({ ...base, action, ...(reason ? { reason } : {}) });
}

export async function runEvidenceCleanup(options: CleanupOptions, deps: CleanupDependencies): Promise<CleanupResult> {
  const parsed = parseCleanupOptions(options);
  const runId = deps.runId();
  const result: CleanupResult = {
    runId,
    bucket: EVIDENCE_BUCKET,
    dryRun: parsed.dryRun,
    limit: parsed.limit,
    considered: 0,
    eligible: 0,
    deleted: 0,
    skipped: 0,
    failures: 0,
    truncated: false
  };
  await deps.audit({ action: "evidence_cleanup_started", runId, dryRun: parsed.dryRun });

  const directories = [""];
  let directoryPages = 0;
  while (directories.length > 0 && result.considered < parsed.limit) {
    const prefix = directories.shift()!;
    let offset = 0;
    while (result.considered < parsed.limit) {
      directoryPages += 1;
      if (directoryPages > MAX_DIRECTORY_PAGES) {
        result.truncated = true;
        break;
      }
      const entries = await deps.list(prefix, offset, PAGE_SIZE);
      for (const entry of entries) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (!entry.id) {
          directories.push(path);
          continue;
        }
        if (result.considered >= parsed.limit) break;
        result.considered += 1;
        const auditBase = { runId, path, dryRun: parsed.dryRun, action: "evidence_cleanup_considered" };
        await deps.audit(auditBase);

        try {
          if (!validEvidencePath(path)) {
            result.skipped += 1;
            await auditOutcome(deps, auditBase, "evidence_cleanup_skipped", "malformed_path");
            continue;
          }
          const createdAt = Date.parse(entry.created_at ?? "");
          if (!Number.isFinite(createdAt)) {
            result.skipped += 1;
            await auditOutcome(deps, auditBase, "evidence_cleanup_skipped", "missing_created_at");
            continue;
          }
          if (deps.now().getTime() - createdAt < RETENTION_MILLISECONDS) {
            result.skipped += 1;
            await auditOutcome(deps, auditBase, "evidence_cleanup_skipped", "younger_than_24_hours");
            continue;
          }
          if (await deps.isReferenced(path)) {
            result.skipped += 1;
            await auditOutcome(deps, auditBase, "evidence_cleanup_skipped", "canonical_reference_exists");
            continue;
          }

          result.eligible += 1;
          if (parsed.dryRun) {
            await auditOutcome(deps, auditBase, "evidence_cleanup_candidate", "dry_run");
            continue;
          }

          // Close the race between discovery and deletion. The retention delay is
          // also longer than the authoritative attendance submission window.
          if (await deps.isReferenced(path)) {
            result.skipped += 1;
            await auditOutcome(deps, auditBase, "evidence_cleanup_skipped", "reference_added_before_delete");
            continue;
          }
          await auditOutcome(deps, auditBase, "evidence_cleanup_delete_authorized");
          await deps.remove(path);
          result.deleted += 1;
          await auditOutcome(deps, auditBase, "evidence_cleanup_deleted");
        } catch {
          result.failures += 1;
          await auditOutcome(deps, auditBase, "evidence_cleanup_failed", "storage_or_reference_error");
        }
      }
      if (entries.length < PAGE_SIZE || directoryPages > MAX_DIRECTORY_PAGES) break;
      offset += PAGE_SIZE;
    }
    if (directoryPages > MAX_DIRECTORY_PAGES) break;
  }
  if (result.considered >= parsed.limit) result.truncated = true;
  await deps.audit({
    action: "evidence_cleanup_completed",
    runId,
    dryRun: parsed.dryRun,
    summary: {
      limit: result.limit,
      considered: result.considered,
      eligible: result.eligible,
      deleted: result.deleted,
      skipped: result.skipped,
      failures: result.failures,
      truncated: result.truncated
    }
  });
  return result;
}
