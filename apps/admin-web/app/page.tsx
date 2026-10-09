import { redirect } from "next/navigation";
import { homeForRole } from "@/lib/auth/roles";
import { resolveAuthenticatedAccount } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await resolveAuthenticatedAccount();
  if (result.status === "authenticated") redirect(homeForRole(result.account.role));
  redirect(`/login?reason=${result.status}`);
}
