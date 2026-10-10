"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { loginSchema, type LoginInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

async function resolveLoginEmail(identifier: string) {
  const normalized = identifier.trim();
  if (normalized.includes("@")) return normalized.toLowerCase();

  const { data, error } = await supabase.functions.invoke<{ email?: string; error?: string }>("resolve-student-login", {
    body: { identifier: normalized.replace(/\s+/g, "").toUpperCase() }
  });

  if (error || !data?.email) {
    throw new Error(data?.error ?? "No active student account was found for this student ID.");
  }

  return data.email;
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("reason");
    const message = reason === "inactive"
      ? "Your account is inactive. Contact the system administrator."
      : reason === "unprovisioned"
        ? "Your account does not have an active Attendance role. Contact the system administrator."
        : null;
    if (reason === "password_reset") {
      queueMicrotask(() => setNotice("Your password was updated. Sign in with your new password."));
    }
    if (message) {
      void supabase.auth.signOut();
      queueMicrotask(() => setError(message));
    }
  }, []);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    let email: string;
    try {
      email = await resolveLoginEmail(values.identifier);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to resolve this account.");
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: values.password
    });
    if (authError || !data.user) {
      setError(authError?.message ?? "Invalid login credentials.");
      return;
    }

    // The root server route reads the trusted database role and sends the
    // account to its authorized interface.
    router.replace("/");
    router.refresh();
  });

  return (
    <main className="clickin-auth relative flex min-h-dvh items-start justify-center overflow-hidden bg-blue-50 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:items-center sm:px-6 sm:py-8">
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="scale-105 object-cover object-center opacity-35 blur-xl" />
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="object-contain object-center" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-blue-50/35 via-white/15 to-blue-50/55" />
      <div className="relative z-10 w-full max-w-sm">
        <header className="mb-4 text-center">
          <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-white/60 bg-blue-50/65 px-4 py-2 shadow-sm backdrop-blur-md">
            <Image src="/logo.png" alt="ClickIn logo" width={52} height={52} className="h-12 w-12 rounded-xl border border-blue-100 bg-white p-1.5 object-contain shadow-sm" priority />
            <p className="text-2xl font-extrabold tracking-tight text-blue-950">ClickIn</p>
          </div>
          <p className="mt-2 text-xs font-medium text-blue-950/75">Caraga State University · Attendance portal</p>
        </header>
        <section className="rounded-[1.4rem] border border-white/80 bg-white/90 p-5 shadow-[0_16px_45px_rgba(30,58,138,0.16)] backdrop-blur-md sm:p-6" aria-labelledby="login-title">
          <h1 id="login-title" className="text-[1.4rem] font-bold tracking-tight text-slate-800">Welcome back</h1>
          <p className="mb-5 mt-1 text-sm leading-5 text-slate-600">Sign in to access your campus attendance account.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="account-identifier" className="mb-1.5 block text-sm font-semibold text-slate-700">Email or Student ID</label>
              <div className="relative">
                <Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input id="account-identifier" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                  aria-invalid={Boolean(form.formState.errors.identifier)} aria-describedby={form.formState.errors.identifier ? "account-identifier-error" : undefined}
                  placeholder="Email address or student ID" className="h-11 rounded-xl border-blue-200 bg-white/75 pl-11 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100"
                  {...form.register("identifier")} />
              </div>
              {form.formState.errors.identifier ? <span id="account-identifier-error" role="alert" className="mt-2 block text-xs font-medium text-rose-700">{form.formState.errors.identifier.message}</span> : null}
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="admin-password" className="text-sm font-semibold text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-700 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password)} aria-describedby={form.formState.errors.password ? "admin-password-error" : undefined}
                  placeholder="Enter your password" className="h-11 rounded-xl border-blue-200 bg-white/75 pl-11 pr-12 text-base text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100"
                  {...form.register("password")} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute right-0.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-800">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.formState.errors.password ? <span id="admin-password-error" role="alert" className="mt-2 block text-xs font-medium text-rose-700">{form.formState.errors.password.message}</span> : null}
            </div>
            {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div> : null}
            {notice ? <div role="status" className="rounded-xl border border-student-200 bg-student-50 p-3 text-sm text-student-800">{notice}</div> : null}
            <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 w-full rounded-xl bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-blue-200 disabled:opacity-60">
              {form.formState.isSubmitting ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Signing in…</span> : "Sign in"}
            </Button>
          </form>
          <div className="mt-5 border-t border-slate-200/70 pt-4 text-center"><p className="text-sm text-slate-600">New student? <Link href="/register" className="font-semibold text-blue-700 hover:underline">Create an account</Link></p><p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck size={15} className="text-blue-600" />Secure access for students and administrators</p></div>
        </section>
        <p className="mx-auto mt-3 w-fit rounded-full bg-white/70 px-3 py-1.5 text-center text-xs leading-5 text-blue-950/80 shadow-sm backdrop-blur-sm">Need help with your account? Contact your school administrator.</p>
      </div>
    </main>
  );
}
