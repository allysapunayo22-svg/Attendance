import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getAuthenticatedUser, requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { user, client } = await getAuthenticatedUser(req);
    const admin = await requireAdmin(user.id, client);

    const body = await req.json();
    const userIds = Array.isArray(body.userIds) ? body.userIds : [];
    const title = String(body.title ?? "");
    const message = String(body.body ?? "");
    const type = String(body.type ?? "event_reminder");

    if (!title || !message || userIds.length === 0) {
      return jsonResponse({ error: "userIds, title, and body are required." }, 400);
    }

    const rows = userIds.map((userId: string) => ({
      user_id: userId,
      title,
      body: message,
      type,
      metadata: body.metadata ?? {}
    }));

    const { error } = await client.from("notifications").insert(rows);
    if (error) return jsonResponse({ error: error.message }, 400);

    const { data: tokens } = await client
      .from("push_tokens")
      .select("token,provider")
      .in("user_id", userIds)
      .eq("is_active", true);

    const expoMessages = (tokens ?? [])
      .filter((token) => token.provider === "expo")
      .map((token) => ({
        to: token.token,
        sound: "default",
        title,
        body: message,
        data: body.metadata ?? {}
      }));

    if (expoMessages.length > 0) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: Deno.env.get("EXPO_ACCESS_TOKEN") ? `Bearer ${Deno.env.get("EXPO_ACCESS_TOKEN")}` : ""
        },
        body: JSON.stringify(expoMessages)
      });
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_user_id: user.id,
      action: "notification.sent",
      entity_type: "notification",
      entity_id: null,
      metadata: {
        actor_role: admin.role,
        admin_profile_id: admin.adminProfileId,
        user_count: userIds.length,
        notification_type: type
      }
    });
    if (auditError) return jsonResponse({ error: "Notifications were sent, but the trusted audit record could not be created." }, 500);

    return jsonResponse({ ok: true, inserted: rows.length, pushed: expoMessages.length });
  } catch (error) {
    if (error instanceof Response) return error;
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error." }, 500);
  }
});
