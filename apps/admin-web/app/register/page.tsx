"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, IdCard, Lock, Mail, ShieldCheck, UserRound } from "lucide-react";
import { registerSchema, type RegisterInput } from "@attendance/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeStudentId, registrationRedirectUrl } from "@/lib/auth/registration";
import { supabase } from "@/lib/supabase";

async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : "Registration verification failed.";
  const context = (error as { context?: { clone?: () => { json?: () => Promise<unknown> }; json?: () => Promise<unknown> } }).context;
  try {
    const reader = context?.clone?.() ?? context;
    const body = await reader?.json?.();
    if (body && typeof body === "object") {
      const value = body as { error?: unknown; message?: unknown };
      if (typeof value.error === "string") return value.error;
      if (typeof value.message === "string") return value.message;
    }
  } catch {
    // Use the provider message when the response body is unavailable.
  }
  return fallback;
}

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { studentId: "", fullName: "", schoolEmail: "", password: "", confirmPassword: "", acceptPrivacy: false }
  });

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    const studentId = normalizeStudentId(values.studentId);
    const schoolEmail = values.schoolEmail.trim().toLowerCase();
    try {
      const { data: eligibility, error: eligibilityError } = await supabase.functions.invoke<{ eligible: boolean; fullName?: string; error?: string }>("verify-student-registration", {
        body: { studentId, schoolEmail }
      });
      if (eligibilityError) throw new Error(eligibility?.error ?? await functionErrorMessage(eligibilityError));
      if (!eligibility?.eligible) throw new Error(eligibility?.error ?? "This student ID and school email are not approved for registration.");

      const { data, error: signupError } = await supabase.auth.signUp({
        email: schoolEmail,
        password: values.password,
        options: {
          emailRedirectTo: registrationRedirectUrl(window.location.origin),
          data: {
            student_id: studentId,
            full_name: eligibility.fullName ?? values.fullName.trim(),
            department_code: "CBEA"
          }
        }
      });
      if (signupError) throw signupError;
      if (data.session && data.user) {
        router.replace("/");
        router.refresh();
        return;
      }
      setConfirmationEmail(schoolEmail);
      form.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create the account.");
    }
  });

  return (
    <main className="clickin-auth relative flex min-h-dvh items-center justify-center overflow-y-auto overflow-x-hidden bg-blue-50 px-4 py-3 sm:px-6 sm:py-4">
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="scale-105 object-cover object-center opacity-35 blur-xl" />
      <Image src="/loginregister.jpeg" alt="" fill priority sizes="100vw" className="object-contain object-center" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-blue-50/35 via-white/15 to-blue-50/55" />
      <div className="relative z-10 w-full max-w-sm">
        <header className="mb-2 text-center sm:mb-2.5">
          <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/60 bg-blue-50/65 px-3 py-1 shadow-sm backdrop-blur-md">
            <Image src="/logo.png" alt="ClickIn logo" width={36} height={36} className="h-8 w-8 rounded-xl border border-blue-100 bg-white p-1 object-contain shadow-sm" priority />
            <p className="text-xl font-extrabold tracking-tight text-blue-950">ClickIn</p>
          </div>
          <p className="mt-1 text-[11px] font-medium text-blue-950/75">Caraga State University · Student Registration</p>
        </header>

        <section className="rounded-[1.4rem] border border-white/80 bg-white/90 p-4 shadow-[0_16px_45px_rgba(30,58,138,0.16)] backdrop-blur-md sm:p-5" aria-labelledby="register-title">
          {confirmationEmail ? (
            <div className="text-center py-2" role="status">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700"><CheckCircle2 size={24} /></span>
              <h1 id="register-title" className="mt-3 text-xl font-bold text-slate-800">Check your school email</h1>
              <p className="mt-2 text-xs leading-5 text-slate-600">We sent a confirmation link to <strong>{confirmationEmail}</strong>. Open it to verify your identity and activate your student account.</p>
              <p className="mt-3 rounded-xl bg-blue-50/80 p-2.5 text-[11px] leading-4 text-blue-900 border border-blue-100">The link must be opened in a browser allowed by ClickIn. Check your spam folder if it does not arrive.</p>
              <Link href="/login" className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"><ArrowLeft size={14} /> Return to sign in</Link>
            </div>
          ) : (
            <>
              <div className="mb-2.5">
                <h1 id="register-title" className="text-lg font-bold tracking-tight text-slate-800 sm:text-[1.25rem]">Create your account</h1>
                <p className="mt-0.5 text-xs text-slate-600">Your student ID and school email must match the approved CBEA roster.</p>
              </div>

              <form onSubmit={submit} className="space-y-2">
                <RegistrationField label="Student ID" icon={IdCard} error={form.formState.errors.studentId?.message} errorId="student-id-error">
                  <Input type="text" autoComplete="username" autoCapitalize="characters" placeholder="e.g. 2026-00123" aria-invalid={Boolean(form.formState.errors.studentId)} aria-describedby={form.formState.errors.studentId ? "student-id-error" : undefined} className="h-9 w-full rounded-xl border-blue-200 bg-white/75 pl-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 sm:h-9.5 sm:text-sm" {...form.register("studentId")} />
                </RegistrationField>

                <RegistrationField label="Full name" icon={UserRound} error={form.formState.errors.fullName?.message} errorId="full-name-error">
                  <Input type="text" autoComplete="name" placeholder="Your complete name" aria-invalid={Boolean(form.formState.errors.fullName)} aria-describedby={form.formState.errors.fullName ? "full-name-error" : undefined} className="h-9 w-full rounded-xl border-blue-200 bg-white/75 pl-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 sm:h-9.5 sm:text-sm" {...form.register("fullName")} />
                </RegistrationField>

                <RegistrationField label="School email" icon={Mail} error={form.formState.errors.schoolEmail?.message} errorId="school-email-error">
                  <Input type="email" autoComplete="email" autoCapitalize="none" placeholder="Your approved school email" aria-invalid={Boolean(form.formState.errors.schoolEmail)} aria-describedby={form.formState.errors.schoolEmail ? "school-email-error" : undefined} className="h-9 w-full rounded-xl border-blue-200 bg-white/75 pl-10 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 sm:h-9.5 sm:text-sm" {...form.register("schoolEmail")} />
                </RegistrationField>

                <RegistrationField label="Password" icon={Lock} error={form.formState.errors.password?.message} errorId="password-error">
                  <PasswordInput visible={showPasswords} autoComplete="new-password" placeholder="At least 8 characters" invalid={Boolean(form.formState.errors.password)} describedBy={form.formState.errors.password ? "password-error" : undefined} register={form.register("password")} onToggle={() => setShowPasswords((v) => !v)} />
                </RegistrationField>

                <RegistrationField label="Confirm password" icon={Lock} error={form.formState.errors.confirmPassword?.message} errorId="confirm-password-error">
                  <PasswordInput visible={showPasswords} autoComplete="new-password" placeholder="Repeat your password" invalid={Boolean(form.formState.errors.confirmPassword)} describedBy={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined} register={form.register("confirmPassword")} onToggle={() => setShowPasswords((v) => !v)} />
                </RegistrationField>

                <div className="pt-0.5">
                  <label htmlFor="accept-privacy" className="flex cursor-pointer items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/40 p-2 text-[11px] leading-4 text-slate-700">
                    <input id="accept-privacy" type="checkbox" className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" {...form.register("acceptPrivacy")} />
                    <span>I confirm my info is accurate and accept the <Link href="/privacy" target="_blank" className="font-semibold text-blue-700 hover:underline">privacy notice</Link>.</span>
                  </label>
                  {form.formState.errors.acceptPrivacy ? <p role="alert" className="mt-1 text-[11px] font-medium text-rose-700">{form.formState.errors.acceptPrivacy.message}</p> : null}
                </div>

                {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">{error}</div> : null}

                <Button type="submit" disabled={form.formState.isSubmitting} className="h-9.5 w-full rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus:ring-blue-200 disabled:opacity-60 sm:h-10 sm:text-sm">
                  {form.formState.isSubmitting ? <span className="flex items-center justify-center gap-2"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Creating account…</span> : "Create account"}
                </Button>
              </form>

              <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-2 text-xs">
                <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                  <ArrowLeft size={13} /> Back to sign in
                </Link>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <ShieldCheck size={13} className="text-blue-600" /> CBEA Verified
                </span>
              </div>
            </>
          )}
        </section>

        <p className="mx-auto mt-2 w-fit rounded-full bg-white/70 px-3 py-1 text-center text-[11px] text-blue-950/80 shadow-sm backdrop-blur-sm">Need help registering? Contact your school administrator.</p>
      </div>
    </main>
  );
}

function RegistrationField({ label, icon: Icon, error, errorId, children }: { label: string; icon: typeof IdCard; error: string | undefined; errorId: string; children: ReactNode }) {
  return (
    <div className="w-full">
      <label className="mb-0.5 block text-xs font-semibold text-slate-700">{label}</label>
      <div className="relative w-full">
        <Icon size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
      {error ? <span id={errorId} role="alert" className="mt-0.5 block text-[11px] font-medium text-rose-700">{error}</span> : null}
    </div>
  );
}

function PasswordInput({ visible, autoComplete, placeholder, invalid, describedBy, register, onToggle }: { visible: boolean; autoComplete: string; placeholder: string; invalid: boolean; describedBy: string | undefined; register: UseFormRegisterReturn; onToggle?: () => void }) {
  return (
    <div className="relative w-full">
      <Input type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={invalid} aria-describedby={describedBy} className="h-9 w-full rounded-xl border-blue-200 bg-white/75 pl-10 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-100 sm:h-9.5 sm:text-sm" {...register} />
      {onToggle ? (
        <button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-0.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-800">
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      ) : null}
    </div>
  );
}
