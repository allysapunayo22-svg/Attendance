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

export function createAuthenticatedClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization") ?? "";

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase authenticated-client configuration.");
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new Response(JSON.stringify({ error: "Missing bearer token." }), { status: 401 });
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization
      }
    },
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
  const { data: userRecord, error: userError } = await client
    .from("users")
    .select("role,is_active")
    .eq("id", userId)
    .single();

  if (userError || !userRecord || !userRecord.is_active || !["admin", "super_admin"].includes(userRecord.role)) {
    throw new Response(JSON.stringify({ error: "Administrator access required." }), { status: 403 });
  }

  const { data: adminProfile, error: profileError } = await client
    .from("admin_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError || !adminProfile) {
    throw new Response(JSON.stringify({ error: "An active administrator profile is required." }), { status: 403 });
  }

  return {
    role: userRecord.role as "admin" | "super_admin",
    adminProfileId: adminProfile.id as string
  };
}
