"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" }
  });

  const submit = form.handleSubmit(async ({ password }) => {
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.code === "same_password"
        ? "Choose a password different from your current password."
        : updateError.code === "weak_password"
          ? "Choose a stronger password that meets the password requirements."
          : "Your password could not be updated. Request a new link if this recovery session has expired.");
      return;
    }

    const completed = await fetch("/auth/recovery/complete", { method: "POST" });
    if (!completed.ok) {
      await supabase.auth.signOut({ scope: "local" });
      window.location.replace("/forgot-password?reason=invalid_link");
      return;
    }
    await supabase.auth.signOut({ scope: "global" });
    window.location.replace("/login?reason=password_reset");
  });

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">Use at least 8 characters, then sign in again.</p>
      </div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">New password</label>
          <div className="relative">
            <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" className="h-12 rounded-xl border-white/10 bg-white/5 pl-10 pr-11 text-white" {...form.register("password")} />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide passwords" : "Show passwords"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {form.formState.errors.password ? <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-400">{form.formState.errors.password.message}</p> : null}
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">Confirm new password</label>
          <Input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" className="h-12 rounded-xl border-white/10 bg-white/5 text-white" {...form.register("confirmPassword")} />
          {form.formState.errors.confirmPassword ? <p role="alert" className="mt-1.5 text-xs font-semibold text-rose-400">{form.formState.errors.confirmPassword.message}</p> : null}
        </div>
        {error ? <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div> : null}
        <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full rounded-xl bg-brand-700 font-semibold text-white hover:bg-brand-800 disabled:opacity-60">
          {form.formState.isSubmitting ? "Updating…" : "Update password"}
        </Button>
      </form>
      <div className="mt-5 border-t border-white/10 pt-4 text-center"><Link href="/login" className="text-xs font-semibold text-blue-300 hover:text-blue-200">Back to sign in</Link></div>
    </>
  );
}
