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
    <main className="clickin-auth relative flex min-h-dvh items-center justify-center overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {/* Background Image & Ambient Depth Overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/loginregister.jpeg"
          alt="Caraga State University Campus"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Dual layer overlay: smooth dark gradient + subtle brand tint to make glass card stand out */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-900/60 to-slate-950/85 backdrop-blur-[2px]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-blue-950/20 mix-blend-multiply"
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[420px] py-4">
        {/* Glassmorphic Auth Card */}
        <section
          className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/[0.88] p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-8"
          aria-labelledby="login-title"
        >
          {/* Subtle top card glow line */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-80" />

          {/* Integrated Header */}
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white/95 px-4 py-2.5 shadow-sm">
              <Image
                src="/logo.png"
                alt="ClickIn logo"
                width={40}
                height={40}
                className="h-10 w-10 rounded-xl bg-blue-50 p-1 object-contain"
                priority
              />
              <span className="text-2xl font-black tracking-tight text-slate-900">
                Click<span className="text-blue-600">In</span>
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Caraga State University · Attendance Portal
            </p>

            <div className="mt-5">
              <h1 id="login-title" className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Sign in to access your campus attendance account.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label
                htmlFor="account-identifier"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Email or Student ID
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  id="account-identifier"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  aria-invalid={Boolean(form.formState.errors.identifier)}
                  aria-describedby={form.formState.errors.identifier ? "account-identifier-error" : undefined}
                  placeholder="e.g. 211-00000 or name@carsu.edu.ph"
                  className="h-11 rounded-xl border-slate-200 bg-white/90 pl-11 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  {...form.register("identifier")}
                />
              </div>
              {form.formState.errors.identifier ? (
                <span
                  id="account-identifier-error"
                  role="alert"
                  className="mt-1.5 block text-xs font-medium text-rose-600"
                >
                  {form.formState.errors.identifier.message}
                </span>
              ) : null}
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  aria-invalid={Boolean(form.formState.errors.password)}
                  aria-describedby={form.formState.errors.password ? "admin-password-error" : undefined}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl border-slate-200 bg-white/90 pl-11 pr-12 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {form.formState.errors.password ? (
                <span
                  id="admin-password-error"
                  role="alert"
                  className="mt-1.5 block text-xs font-medium text-rose-600"
                >
                  {form.formState.errors.password.message}
                </span>
              ) : null}
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200/80 bg-rose-50/90 p-3 text-xs font-medium leading-relaxed text-rose-700 backdrop-blur-sm"
              >
                {error}
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="rounded-xl border border-blue-200/80 bg-blue-50/90 p-3 text-xs font-medium leading-relaxed text-blue-800 backdrop-blur-sm"
              >
                {notice}
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="group relative mt-2 h-11 w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-md shadow-blue-500/25 transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] disabled:opacity-70"
            >
              {form.formState.isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Card Footer */}
          <div className="mt-6 border-t border-slate-200/80 pt-4 text-center">
            <p className="text-xs text-slate-600">
              New student?{" "}
              <Link
                href="/register"
                className="font-bold text-blue-600 underline-offset-4 hover:underline"
              >
                Create an account
              </Link>
            </p>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-500">
              <ShieldCheck size={14} className="text-emerald-600" />
              Secure access for students and administrators
            </p>
          </div>
        </section>

        {/* Support Help Pill */}
        <p className="mx-auto mt-4 max-w-sm rounded-full border border-white/20 bg-slate-900/60 px-4 py-1.5 text-center text-xs font-medium text-white/90 shadow-md backdrop-blur-md">
          Need help? Contact your school administrator.
        </p>
      </div>
    </main>
  );
}
