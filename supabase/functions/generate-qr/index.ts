import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { createAuthenticatedClient, getAuthenticatedUser, requireAdmin } from "../_shared/supabase.ts";
import { validateGenerateQrPayload } from "./validation.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client: serviceClient } = await getAuthenticatedUser(req);
    await requireAdmin(user.id, serviceClient);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "A valid JSON QR request is required." }, 400);
    }

    const payload = validateGenerateQrPayload(body);
    if (payload instanceof Response) return payload;

    const authenticatedClient = createAuthenticatedClient(req);
    const { data, error } = await authenticatedClient.rpc("generate_event_qr_token", {
      p_event_id: payload.eventId,
      p_ttl_seconds: payload.ttlSeconds
    });

    if (error) {
      return jsonResponse({ error: "Unable to create the QR token atomically." }, 503);
    }

    const result = data as { ok?: boolean; token?: string; expires_at?: string; error?: string; code?: string } | null;
    if (!result?.ok || !result.token || !result.expires_at) {
      const status = result?.code === "administrator_access_required" ? 403 : result?.code === "event_not_found" ? 404 : 409;
      return jsonResponse({ error: result?.error ?? "QR generation was rejected.", code: result?.code }, status);
    }

    return jsonResponse({ token: result.token, expiresAt: result.expires_at });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
