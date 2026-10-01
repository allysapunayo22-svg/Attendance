import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { supabase } from "../services/supabase";
import { authRedirectUrl } from "../services/authRedirect";
import { authFeedback } from "../services/authFeedback";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useResendCooldown } from "../hooks/useResendCooldown";
import { AuthField } from "./AuthField";
import { AuthButton, AuthLink, AuthNotice, AuthScreen } from "./AuthScreen";

const emailSchema = z.object({ email: z.string().trim().email("Enter your school email address.").max(160) });

export function AuthEmailScreen({ mode }: { mode: "recovery" | "signup" }) {
  const params = useLocalSearchParams<{ email?: string; sent?: string }>();
  const initialEmail = typeof params.email === "string" ? params.email : "";
  const [sent, setSent] = useState(params.sent === "1");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const online = useOnlineStatus();
  const form = useForm<{ email: string }>({ resolver: zodResolver(emailSchema), mode: "onBlur", defaultValues: { email: initialEmail } });
  // One cooldown per action, including after editing an email or changing screens.
  const { remaining, start } = useResendCooldown(mode);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && params.sent === "1") start();
    initialized.current = true;
  }, [params.sent, start]);
  const recovery = mode === "recovery";
  const feedback = error ? authFeedback(error) : null;
  const submit = form.handleSubmit(async ({ email }) => {
    if (!online || remaining > 0 || pending.current) return;
    pending.current = true;
    setError(null);
    try {
      const address = email.toLowerCase();
      const result = recovery
        ? await supabase.auth.resetPasswordForEmail(address, { redirectTo: authRedirectUrl() })
        : await supabase.auth.resend({ type: "signup", email: address, options: { emailRedirectTo: authRedirectUrl() } });
      if (result.error) throw result.error;
      setSent(true);
      start();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to send email.";
      setError(message);
      if (/rate limit|too many|security purposes/i.test(message)) start();
    } finally {
      pending.current = false;
    }
  });

  return (
    <AuthScreen title={recovery ? "Reset your password" : "Confirm your school email"}
      description={recovery ? "We’ll send a password reset link to the school email registered to your account." : "Open your confirmation email to activate your student account. You can request another here."}
      back={() => { if (!form.formState.isSubmitting) router.replace("/(auth)/login"); }}>
      <Controller control={form.control} name="email" render={({ field }) => (
        <AuthField label="Registered school email" ref={field.ref} value={field.value}
          onChangeText={(value) => { field.onChange(value); setSent(false); setError(null); }} onBlur={field.onBlur}
          error={form.formState.errors.email?.message} autoCapitalize="none" keyboardType="email-address"
          autoComplete="email" textContentType="emailAddress" returnKeyType="send"
          editable={!form.formState.isSubmitting} onSubmitEditing={() => void submit()} />
      )} />
      {sent ? <AuthNotice tone="success" title="Check your inbox" message={recovery
        ? "If an account exists for this email, a reset link has been requested. Open the latest email on this phone. Check your spam folder too."
        : "If this email has an account awaiting confirmation, a verification email has been requested. Open the latest email on this phone, then return to sign in. Check your spam folder too."} /> : null}
      {feedback ? <AuthNotice tone="error" title={feedback.title} message={feedback.message} /> : null}
      <AuthButton title={remaining > 0 ? `Send again in ${remaining}s` : recovery ? (sent ? "Resend reset link" : "Send reset link") : "Resend confirmation email"}
        loading={form.formState.isSubmitting} disabled={!online || remaining > 0} onPress={submit} />
      <Text className="text-sm leading-5 text-slate-500">Use the email you registered with. If you entered the wrong address during registration or cannot access that inbox, the CBEA office can help verify and correct your record.</Text>
      <AuthLink label="Back to sign in" disabled={form.formState.isSubmitting} onPress={() => router.replace("/(auth)/login")} />
    </AuthScreen>
  );
}
