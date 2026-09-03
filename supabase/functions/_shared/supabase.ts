import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.1";

export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service configuration.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    throw new Response(JSON.stringify({ error: "Missing bearer token." }), { status: 401 });
  }

  const client = createServiceClient();
  const { data: claimsData, error: claimsError } = await client.auth.getClaims(token);
  const userId = claimsData?.claims?.sub;
  if (claimsError || typeof userId !== "string" || !userId) {
    throw new Response(JSON.stringify({ error: "Invalid bearer token." }), { status: 401 });
  }

  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Authenticated user was not found." }), { status: 401 });
  }

  return { user: data.user, client };
}

export async function requireAdmin(userId: string, client: ReturnType<typeof createServiceClient>) {
  const { data, error } = await client
    .from("users")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data || !["admin", "super_admin"].includes(data.role)) {
    throw new Response(JSON.stringify({ error: "Administrator access required." }), { status: 403 });
  }
}
