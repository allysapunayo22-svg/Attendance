"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { loginSchema, type LoginInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: values.identifier,
      password: values.password
    });
    if (authError || !data.user) {
      setError(authError?.message ?? "Invalid login credentials.");
      return;
    }

    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      await supabase.auth.signOut();
      setError("Access denied: Administrator privileges required.");
      return;
    }

    router.replace("/");
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#070f26] via-[#0b1633] to-[#040817] p-4 sm:p-6 lg:p-8">
      {/* Ambient background glow effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[140px]" />
      <div className="pointer-events-none absolute -bottom-40 right-10 h-[400px] w-[400px] rounded-full bg-indigo-600/15 blur-[130px]" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-b from-blue-600/25 to-[#0b1633] p-2 shadow-2xl shadow-slate-950/60 ring-1 ring-blue-500/30 backdrop-blur-xl">
            <Image
              src="/logo.png"
              alt="Campus Attendance Logo"
              width={72}
              height={72}
              className="h-full w-full object-contain drop-shadow-md"
              priority
            />
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-2 ring-[#0b1633]">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-blue-300">
            <Sparkles size={13} className="text-blue-400" /> CSU Attendance System
          </span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Admin Operations Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Sign in to supervise events, geofences, and attendance records.</p>
        </div>

        {/* Login Card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Administrator Email
              </label>
              <div className="relative">
                <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  aria-invalid={Boolean(form.formState.errors.identifier)}
                  aria-describedby={form.formState.errors.identifier ? "admin-email-error" : undefined}
                  placeholder="admin@csu.edu.ph"
                  className="h-12 rounded-xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-slate-500 focus:border-brand-500 focus:bg-white/10"
                  {...form.register("identifier")}
                />
              </div>
              {form.formState.errors.identifier ? (
                <span id="admin-email-error" role="alert" className="mt-1.5 block text-xs font-semibold text-rose-400">{form.formState.errors.identifier.message}</span>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="admin-password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password ? "admin-password-error" : undefined}
                  placeholder="••••••••••••"
                  className="h-12 rounded-xl border-white/10 bg-white/5 pl-10 pr-11 text-white placeholder:text-slate-500 focus:border-brand-500 focus:bg-white/10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <span id="admin-password-error" role="alert" className="mt-1.5 block text-xs font-semibold text-rose-400">{form.formState.errors.password.message}</span>
              ) : null}
            </div>

            {error ? (
              <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300">
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="mt-2 h-12 w-full rounded-xl bg-brand-700 hover:bg-brand-800 font-semibold text-white shadow-lg shadow-blue-950/40 transition active:scale-[0.99] disabled:opacity-60"
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Authenticating…
                </span>
              ) : (
                "Sign In to Console"
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-white/10 pt-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck size={14} className="text-brand-400" />
              <span>Campus Role-Based Access Control</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Caraga State University • Attendance Verification Portal
        </p>
      </div>
    </main>
  );
}
