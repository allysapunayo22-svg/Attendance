import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthField, PasswordGuidance } from "../src/components/AuthField";
import { AuthButton, AuthLink, AuthNotice, AuthScreen } from "../src/components/AuthScreen";
import { createAuthLinkClient } from "../src/services/authRedirect";
import { parseAuthCallback } from "../src/services/authFeedback";
import { useOnlineStatus } from "../src/hooks/useOnlineStatus";

const passwordSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters."),
  confirmation: z.string().min(1, "Confirm your new password.")
}).refine((value) => value.password === value.confirmation, { path: ["confirmation"], message: "Passwords do not match." });

export default function AuthCallbackScreen() {
  const url = Linking.useLinkingURL();
  const online = useOnlineStatus();
  const [client] = useState(createAuthLinkClient);
  const [status, setStatus] = useState<"checking" | "recovery" | "confirmed" | "updated" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const operation = useRef<{ url: string; promise: Promise<"recovery" | "confirmed"> } | null>(null);
  const pending = useRef(false);
  const form = useForm<{ password: string; confirmation: string }>({
    resolver: zodResolver(passwordSchema), mode: "onBlur", defaultValues: { password: "", confirmation: "" }
  });

  useEffect(() => {
    if (!url) return;
    let active = true;
    if (operation.current?.url !== url) {
      setStatus("checking");
      setError(null);
      operation.current = { url, promise: (async () => {
        const parsed = parseAuthCallback(url);
        const { data, error: sessionError } = await client.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
        if (sessionError || !data.session) throw new Error("This link could not be verified. Check your connection, then request a new email link.");
        if (parsed.type === "recovery") return "recovery" as const;
        await client.auth.signOut({ scope: "local" });
        return "confirmed" as const;
      })() };
    }
    void operation.current.promise.then((next) => {
      if (active) setStatus(next);
    }).catch((cause) => {
      if (!active) return;
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "This email link could not be verified.");
    });
    return () => { active = false; };
  }, [url, client]);

  const submit = form.handleSubmit(async ({ password }) => {
    if (!online || status !== "recovery" || pending.current) return;
    pending.current = true;
    setError(null);
    try {
      const { error: updateError } = await client.auth.updateUser({ password });
      if (updateError) {
        if (updateError.code === "same_password") throw new Error("Choose a password different from your current password.");
        if (updateError.code === "weak_password") throw new Error("Choose a stronger password that meets your school’s password requirements.");
        throw new Error("Your password could not be updated. Check your connection and try again. If the link has expired, request a new reset email.");
      }
      form.reset();
      setStatus("updated");
      await client.auth.signOut({ scope: "local" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your password. Please try again.");
    } finally {
      pending.current = false;
    }
  });

  return (
    <AuthScreen title={status === "recovery" ? "Set a new password" : status === "updated" ? "Password updated" : status === "confirmed" ? "Email confirmed" : "Verify your email link"}
      description={status === "recovery" ? "Choose a new password for your ClickIn account." : status === "updated" ? "You can now sign in using your new password." : status === "confirmed" ? "Your school email is confirmed. Sign in to continue; your school’s roster checks still apply." : "We’ll check your link before you continue."}>
      {status === "checking" && url ? <ActivityIndicator accessibilityLabel="Verifying email link" color="#0f766e" /> : null}
      {!url ? <Text className="text-sm leading-6 text-slate-600">Open the latest confirmation or password reset link from your school email on this phone.</Text> : null}
      {error ? <AuthNotice title="Unable to continue" message={error} tone="error" /> : null}
      {status === "recovery" ? <>
        <Controller control={form.control} name="password" render={({ field }) => (
          <AuthField label="New password" password ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.password?.message} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="next" onSubmitEditing={() => form.setFocus("confirmation")} editable={!form.formState.isSubmitting} />
        )} />
        <Controller control={form.control} name="confirmation" render={({ field }) => (
          <AuthField label="Confirm new password" password ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.confirmation?.message} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="done" onSubmitEditing={() => void submit()} editable={!form.formState.isSubmitting} />
        )} />
        <PasswordGuidance password={form.watch("password")} confirmation={form.watch("confirmation")} />
        <AuthButton title="Save new password" loading={form.formState.isSubmitting} disabled={!online} onPress={submit} />
      </> : null}
      {status === "error" || status === "recovery" || !url ? <>
        <AuthLink label="Request a new password reset link" disabled={form.formState.isSubmitting} onPress={() => router.replace("/(auth)/forgot-password")} />
        <AuthLink label="Resend email confirmation" disabled={form.formState.isSubmitting} onPress={() => router.replace("/(auth)/verify-email")} />
      </> : null}
      <AuthLink label="Back to sign in" disabled={form.formState.isSubmitting} onPress={() => router.replace("/(auth)/login")} />
    </AuthScreen>
  );
}
