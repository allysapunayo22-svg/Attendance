"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recoveryRedirectUrl } from "@/lib/auth/recovery";
import { supabase } from "@/lib/supabase";

const NEUTRAL_CONFIRMATION = "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.";

export default function ForgotPasswordForm({ invalidLink }: { invalidLink: boolean }) {
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });
  const submit = form.handleSubmit(async ({ email }) => {
    // Supabase intentionally returns an indistinguishable result for unknown
    // accounts. Keep the UI response identical for every submitted address.
    try {
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: recoveryRedirectUrl(window.location.origin)
      });
    } catch {
      // Keep recovery responses indistinguishable, including provider errors.
    } finally {
      setSent(true);
    }
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#070f26] via-[#0b1633] to-[#040817] p-4 sm:p-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="ClickIn logo" width={72} height={72} className="mb-3 h-20 w-20 rounded-3xl object-contain" priority />
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Reset your password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Enter the email registered to your Attendance account.</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          {invalidLink ? (
            <div role="alert" className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
              That reset link is invalid or expired. Request a new link below.
            </div>
          ) : null}
          {sent ? (
            <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">
              {NEUTRAL_CONFIRMATION}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="recovery-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">Email</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input id="recovery-email" type="email" autoComplete="email" placeholder="you@csu.edu.ph"
                    aria-invalid={Boolean(form.formState.errors.email)} className="h-12 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500"
                    {...form.register("email")} />
                </div>
                {form.formState.errors.email ? <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-400">{form.formState.errors.email.message}</p> : null}
              </div>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
                {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
            <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-blue-300 hover:text-blue-200"><ArrowLeft size={14} /> Back to sign in</Link>
            <span className="inline-flex items-center gap-1.5 text-slate-500"><ShieldCheck size={14} /> Secure recovery</span>
          </div>
        </div>
      </div>
    </main>
  );
}
