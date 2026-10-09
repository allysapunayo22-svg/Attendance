import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRole } from "@attendance/types";
import { homeForRole, isAdminRole, isUserRole } from "./roles";

type AuthenticatedAccount = {
  userId: string;
  email: string | null;
  role: UserRole;
};

type AccountResult =
  | { status: "authenticated"; account: AuthenticatedAccount }
  | { status: "unauthenticated" | "inactive" | "unprovisioned" };

export async function resolveAuthenticatedAccount(): Promise<AccountResult> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot always write cookies. Middleware refreshes
            // the session before protected layouts execute.
          }
        }
      }
    }
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { status: "unauthenticated" };
  }

  // The database-controlled public.users row is the authorization authority.
  // User-editable auth metadata is deliberately excluded from this decision.
  const { data: account, error: accountError } = await supabase
    .from("users")
    .select("role,is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (accountError || !account || !isUserRole(account.role)) {
    return { status: "unprovisioned" };
  }

  if (!account.is_active) {
    return { status: "inactive" };
  }

  return {
    status: "authenticated",
    account: {
      userId: userData.user.id,
      email: userData.user.email ?? null,
      role: account.role
    }
  };
}

function loginDestination(status: Exclude<AccountResult["status"], "authenticated">) {
  const reason = status === "inactive" ? "inactive" : status === "unprovisioned" ? "unprovisioned" : "session_required";
  return `/login?reason=${reason}`;
}

export async function requireAdmin() {
  const result = await resolveAuthenticatedAccount();
  if (result.status !== "authenticated") redirect(loginDestination(result.status));
  if (!isAdminRole(result.account.role)) redirect(homeForRole(result.account.role));
  return result.account;
}

export async function requireStudent() {
  const result = await resolveAuthenticatedAccount();
  if (result.status !== "authenticated") redirect(loginDestination(result.status));
  if (result.account.role !== "student") redirect(homeForRole(result.account.role));
  return result.account;
}
