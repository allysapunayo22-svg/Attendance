import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import { RECOVERY_COOKIE_NAME } from "@/lib/auth/recovery";
import ResetPasswordForm from "./reset-password-form";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => undefined } }
  );
  const { data } = await supabase.auth.getUser();
  const recoveryUserId = cookieStore.get(RECOVERY_COOKIE_NAME)?.value;
  const validRecovery = Boolean(data.user && recoveryUserId === data.user.id);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#070f26] via-[#0b1633] to-[#040817] p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
        {validRecovery ? <ResetPasswordForm /> : (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Reset link unavailable</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">This password reset session is invalid or expired. Request a new link to continue.</p>
            <Link href="/forgot-password" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">Request a new link</Link>
          </div>
        )}
      </div>
    </main>
  );
}
