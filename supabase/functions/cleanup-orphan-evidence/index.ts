import { createServiceClient } from "../_shared/supabase.ts";
import { EVIDENCE_BUCKET, parseCleanupOptions, runEvidenceCleanup, validCleanupSecret, type CleanupAudit } from "./core.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const expectedSecret = Deno.env.get("ORPHAN_CLEANUP_SECRET");
  const receivedSecret = request.headers.get("x-cleanup-secret") ?? "";
  if (!(await validCleanupSecret(receivedSecret, expectedSecret ?? ""))) {
    return json({ error: "Unauthorized." }, 401);
  }

  let options;
  try {
    const rawBody = await request.text();
    options = parseCleanupOptions(rawBody ? JSON.parse(rawBody) : {});
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Invalid cleanup request." }, 400);
  }

  const client = createServiceClient();
  const audit = async (record: CleanupAudit) => {
    const { error } = await client.from("audit_logs").insert({
      actor_user_id: null,
      action: record.action,
      entity_type: "storage.object",
      entity_id: null,
      metadata: {
        run_id: record.runId,
        bucket: EVIDENCE_BUCKET,
        dry_run: record.dryRun,
        ...(record.path ? { path: record.path } : {}),
        ...(record.reason ? { reason: record.reason } : {}),
        ...(record.summary ? { summary: record.summary } : {})
      }
    });
    if (error) throw new Error("Cleanup audit write failed.");
  };

  try {
    const result = await runEvidenceCleanup(options, {
      now: () => new Date(),
      runId: () => crypto.randomUUID(),
      audit,
      list: async (prefix, offset, limit) => {
        const { data, error } = await client.storage.from(EVIDENCE_BUCKET).list(prefix, {
          limit,
          offset,
          sortBy: { column: "name", order: "asc" }
        });
        if (error) throw new Error("Evidence inventory failed.");
        return data ?? [];
      },
      isReferenced: async (path) => {
        const [sessions, evidence] = await Promise.all([
          client.from("attendance_sessions").select("id").or(`time_in_photo_path.eq.${path},time_out_photo_path.eq.${path}`).limit(1),
          client.from("attendance_evidence").select("id").eq("storage_path", path).limit(1)
        ]);
        if (sessions.error || evidence.error) throw new Error("Canonical evidence reference check failed.");
        return Boolean(sessions.data?.length || evidence.data?.length);
      },
      remove: async (path) => {
        const { data, error } = await client.storage.from(EVIDENCE_BUCKET).remove([path]);
        if (error || data?.length !== 1 || data[0]?.name !== path) throw new Error("Evidence deletion failed.");
      }
    });
    return json(result);
  } catch {
    return json({ error: "Cleanup could not complete safely." }, 503);
  }
});
