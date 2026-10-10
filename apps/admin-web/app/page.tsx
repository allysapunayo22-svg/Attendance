import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ClickInLandingPage } from "@/components/landing/ClickInLandingPage";
import { homeForRole } from "@/lib/auth/roles";
import { resolveAuthenticatedAccount } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ClickIn — Smart Student Attendance",
  description: "Access assigned events, securely mark attendance, and track your student attendance records with ClickIn."
};

export default async function HomePage() {
  const result = await resolveAuthenticatedAccount();
  if (result.status === "authenticated") redirect(homeForRole(result.account.role));
  return <ClickInLandingPage />;
}
