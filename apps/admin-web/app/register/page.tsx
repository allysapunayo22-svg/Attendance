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
    <main className="clickin-auth flex min-h-dvh items-center justify-center bg-student-50 px-4 py-10 sm:px-6">
      <div className="w-full max-w-xl">
        <header className="mb-7 text-center">
          <Image src="/logo.png" alt="ClickIn logo" width={68} height={68} className="mx-auto h-[68px] w-[68px] rounded-2xl border border-student-200 bg-white p-2 object-contain shadow-sm" priority />
          <p className="mt-4 text-3xl font-bold tracking-tight text-slate-800">ClickIn</p>
          <p className="mt-1 text-sm text-slate-500">Student account registration</p>
        </header>

        <section className="rounded-3xl border border-student-200 bg-white p-6 shadow-[0_8px_30px_rgba(38,63,86,0.05)] sm:p-8">
          {confirmationEmail ? (
            <div className="text-center" role="status">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-student-100 text-student-700"><CheckCircle2 size={26} /></span>
              <h1 className="mt-4 text-2xl font-semibold text-slate-800">Check your school email</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">We sent a confirmation link to <strong>{confirmationEmail}</strong>. Open it to verify your identity and activate your student account.</p>
              <p className="mt-3 rounded-xl bg-student-50 p-3 text-xs leading-5 text-student-800">The link must be opened in a browser allowed by ClickIn. Check your spam folder if it does not arrive.</p>
              <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-student-700 px-5 text-sm font-semibold text-white hover:bg-student-800"><ArrowLeft size={16} /> Return to sign in</Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-800">Create your account</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">Your student ID and school email must match the approved CBEA roster.</p>
              <form onSubmit={submit} className="mt-7 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <RegistrationField label="Student ID" icon={IdCard} error={form.formState.errors.studentId?.message} errorId="student-id-error">
                    <Input type="text" autoComplete="username" autoCapitalize="characters" placeholder="e.g. 2026-00123" aria-invalid={Boolean(form.formState.errors.studentId)} aria-describedby={form.formState.errors.studentId ? "student-id-error" : undefined} className="h-12 border-student-200 bg-slate-50/60 pl-11 text-base focus:border-student-500 focus:ring-student-100" {...form.register("studentId")} />
                  </RegistrationField>
                  <RegistrationField label="Full name" icon={UserRound} error={form.formState.errors.fullName?.message} errorId="full-name-error">
                    <Input type="text" autoComplete="name" placeholder="Your complete name" aria-invalid={Boolean(form.formState.errors.fullName)} aria-describedby={form.formState.errors.fullName ? "full-name-error" : undefined} className="h-12 border-student-200 bg-slate-50/60 pl-11 text-base focus:border-student-500 focus:ring-student-100" {...form.register("fullName")} />
                  </RegistrationField>
                </div>
                <RegistrationField label="School email" icon={Mail} error={form.formState.errors.schoolEmail?.message} errorId="school-email-error">
                  <Input type="email" autoComplete="email" autoCapitalize="none" placeholder="Your approved school email" aria-invalid={Boolean(form.formState.errors.schoolEmail)} aria-describedby={form.formState.errors.schoolEmail ? "school-email-error" : undefined} className="h-12 border-student-200 bg-slate-50/60 pl-11 text-base focus:border-student-500 focus:ring-student-100" {...form.register("schoolEmail")} />
                </RegistrationField>
                <div className="grid gap-5 sm:grid-cols-2">
                  <RegistrationField label="Password" icon={Lock} error={form.formState.errors.password?.message} errorId="password-error">
                    <PasswordInput visible={showPasswords} autoComplete="new-password" placeholder="At least 8 characters" invalid={Boolean(form.formState.errors.password)} describedBy={form.formState.errors.password ? "password-error" : undefined} register={form.register("password")} />
                  </RegistrationField>
                  <RegistrationField label="Confirm password" icon={Lock} error={form.formState.errors.confirmPassword?.message} errorId="confirm-password-error">
                    <PasswordInput visible={showPasswords} autoComplete="new-password" placeholder="Repeat your password" invalid={Boolean(form.formState.errors.confirmPassword)} describedBy={form.formState.errors.confirmPassword ? "confirm-password-error" : undefined} register={form.register("confirmPassword")} />
                  </RegistrationField>
                </div>
                <button type="button" onClick={() => setShowPasswords((visible) => !visible)} aria-pressed={showPasswords} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-student-700 hover:underline">{showPasswords ? <EyeOff size={15} /> : <Eye size={15} />}{showPasswords ? "Hide passwords" : "Show passwords"}</button>
                <div>
                  <div className="flex min-h-12 items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-6 text-slate-700">
                    <input id="accept-privacy" type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300 accent-student-700" {...form.register("acceptPrivacy")} />
                    <span><label htmlFor="accept-privacy" className="cursor-pointer">I confirm that my information is accurate and accept the </label><Link href="/privacy" target="_blank" className="font-semibold text-student-700 hover:underline">attendance privacy notice</Link>.</span>
                  </div>
                  {form.formState.errors.acceptPrivacy ? <p role="alert" className="mt-2 text-xs font-medium text-rose-700">{form.formState.errors.acceptPrivacy.message}</p> : null}
                </div>
                {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800">{error}</div> : null}
                <Button type="submit" disabled={form.formState.isSubmitting} className="h-12 w-full rounded-xl bg-student-700 font-semibold text-white shadow-sm hover:bg-student-800 focus:ring-student-200">{form.formState.isSubmitting ? "Creating account…" : "Create account"}</Button>
              </form>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5 text-xs"><Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-student-700 hover:underline"><ArrowLeft size={14} /> Back to sign in</Link><span className="inline-flex items-center gap-1.5 text-slate-500"><ShieldCheck size={14} /> Roster-verified registration</span></div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function RegistrationField({ label, icon: Icon, error, errorId, children }: { label: string; icon: typeof IdCard; error: string | undefined; errorId: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><span className="relative block"><Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" />{children}</span>{error ? <span id={errorId} role="alert" className="mt-2 block text-xs font-medium text-rose-700">{error}</span> : null}</label>;
}

function PasswordInput({ visible, autoComplete, placeholder, invalid, describedBy, register }: { visible: boolean; autoComplete: string; placeholder: string; invalid: boolean; describedBy: string | undefined; register: UseFormRegisterReturn }) {
  return <Input type={visible ? "text" : "password"} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={invalid} aria-describedby={describedBy} className="h-12 border-student-200 bg-slate-50/60 pl-11 text-base focus:border-student-500 focus:ring-student-100" {...register} />;
}
