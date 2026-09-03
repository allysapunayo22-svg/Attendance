import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client } = await getAuthenticatedUser(req);
    await requireAdmin(user.id, client);
    const body = await req.json();
    const eventId = String(body.eventId);
    const ttlSeconds = Math.min(Math.max(Number(body.ttlSeconds ?? 30), 10), 300);
    const expiresAtSeconds = Math.floor((Date.now() + ttlSeconds * 1000) / 1000);
    const nonce = crypto.randomUUID();

    const token = `${eventId}:${expiresAtSeconds}:${nonce}`;
    const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const { data: admin } = await client
      .from("admin_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    await client.from("event_qr_tokens").insert({
      event_id: eventId,
      token_hash: tokenHash,
      expires_at: new Date(expiresAtSeconds * 1000).toISOString(),
      created_by: admin?.id
    });
    await client.rpc("log_audit", {
      p_action: "event.qr.generated",
      p_entity_type: "event",
      p_entity_id: eventId,
      p_metadata: { expiresAtSeconds, ttlSeconds }
    });

    return jsonResponse({
      token,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString()
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
