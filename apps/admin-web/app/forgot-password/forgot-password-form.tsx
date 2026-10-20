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
    <main className="clickin-auth relative flex min-h-dvh items-center justify-center overflow-hidden bg-blue-50 px-4 py-8 sm:px-6">
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="scale-105 object-cover object-center opacity-35 blur-xl" />
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="object-contain object-center" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-blue-50/35 via-white/15 to-blue-50/55" />
      <div className="relative z-10 w-full max-w-sm">
        <header className="mb-4 text-center">
          <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/60 bg-blue-50/65 px-4 py-2 shadow-sm backdrop-blur-md">
            <Image src="/logo.png" alt="ClickIn logo" width={52} height={52} className="h-12 w-12 rounded-xl border border-blue-100 bg-white p-1.5 object-contain shadow-sm" priority />
            <p className="text-2xl font-extrabold tracking-tight text-blue-950">ClickIn</p>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-950/75">Caraga State University · Password Recovery</p>
        </header>

        <section className="rounded-[1.4rem] border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(30,58,138,0.16)] backdrop-blur-md sm:p-6" aria-labelledby="forgot-title">
          <h1 id="forgot-title" className="text-[1.4rem] font-bold tracking-tight text-slate-800">Reset your password</h1>
          <p className="mb-5 mt-1 text-sm leading-5 text-slate-600">Enter the email address associated with your account.</p>

          {invalidLink ? (
            <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              That reset link is invalid or expired. Request a new link below.
            </div>
          ) : null}

          {sent ? (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              {NEUTRAL_CONFIRMATION}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email address</label>
                <div className="relative">
                  <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@csu.edu.ph"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    aria-describedby={form.formState.errors.email ? "recovery-email-error" : undefined}
                    className="h-11 rounded-xl border-blue-200 bg-white/75 pl-11 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100"
                    {...form.register("email")}
                  />
                </div>
                {form.formState.errors.email ? (
                  <span id="recovery-email-error" role="alert" className="mt-2 block text-xs font-medium text-rose-700">
                    {form.formState.errors.email.message}
                  </span>
                ) : null}
              </div>

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-blue-200 disabled:opacity-60"
              >
                {form.formState.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Sending reset link…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-slate-200/70 pt-4 text-xs">
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
              <ArrowLeft size={14} /> Back to sign in
            </Link>
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <ShieldCheck size={14} className="text-blue-600" /> Secure recovery
            </span>
          </div>
        </section>

        <p className="mx-auto mt-3 w-fit rounded-full bg-white/70 px-3 py-1.5 text-center text-xs leading-5 text-blue-950/80 shadow-sm backdrop-blur-sm">
          Need help with your account? Contact your school administrator.
        </p>
      </div>
    </main>
  );
}
