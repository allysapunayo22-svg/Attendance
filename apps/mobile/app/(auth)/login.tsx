import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { loginSchema, type LoginInput } from "@attendance/validation";
import { AuthField } from "../../src/components/AuthField";
import { AuthButton, AuthLink, AuthNotice, AuthScreen } from "../../src/components/AuthScreen";
import { hasSeenWelcome } from "../../src/services/onboarding";
import { authFeedback } from "../../src/services/authFeedback";
import { useAuthStore } from "../../src/stores/authStore";
import { useOnlineStatus } from "../../src/hooks/useOnlineStatus";

export default function LoginScreen() {
  const online = useOnlineStatus();
  const pending = useRef(false);
  const { login, loading, error } = useAuthStore();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
    mode: "onBlur"
  });
  useEffect(() => { useAuthStore.setState({ error: null }); }, []);
  const feedback = error ? authFeedback(error) : null;
  const onSubmit = form.handleSubmit(async (values) => {
    if (!online || loading || pending.current) return;
    pending.current = true;
    try {
      await login(values.identifier.trim(), values.password);
      const student = useAuthStore.getState().student;
      const seenWelcome = student ? await hasSeenWelcome(student.id) : true;
      router.replace(seenWelcome ? "/(student)" : "/welcome");
    } catch { /* The auth store owns the visible error. */ }
    finally { pending.current = false; }
  });

  return (
    <AuthScreen title="Welcome back." description="Your campus events and attendance, all in one place. Sign in to get started.">
      <Controller control={form.control} name="identifier" render={({ field }) => (
        <AuthField label="Student ID or school email" ref={field.ref} value={field.value}
          onChangeText={(value) => { field.onChange(value); if (error) useAuthStore.setState({ error: null }); }} onBlur={field.onBlur}
          error={form.formState.errors.identifier?.message} autoCapitalize="none" autoComplete="username"
          textContentType="username" returnKeyType="next" onSubmitEditing={() => form.setFocus("password")} editable={!loading} />
      )} />
      <View>
        <Controller control={form.control} name="password" render={({ field }) => (
          <AuthField label="Password" password ref={field.ref} value={field.value}
            onChangeText={(value) => { field.onChange(value); if (error) useAuthStore.setState({ error: null }); }} onBlur={field.onBlur}
            error={form.formState.errors.password?.message} autoCapitalize="none" autoComplete="current-password"
            textContentType="password" returnKeyType="done" onSubmitEditing={() => void onSubmit()} editable={!loading} />
        )} />
        <AuthLink label="Forgot password?" align="right" disabled={loading}
          onPress={() => router.push({ pathname: "/(auth)/forgot-password", params: { email: form.getValues("identifier").includes("@") ? form.getValues("identifier").trim() : "" } })} />
      </View>
      {feedback ? <AuthNotice title={feedback.title} message={feedback.message} tone="error" /> : null}
      <AuthButton title="Log in" loading={loading} disabled={!online} onPress={onSubmit} />
      <AuthLink label={feedback?.verification ? "Resend my confirmation email" : "Email not verified? Resend confirmation"}
        disabled={loading} onPress={() => router.push({ pathname: "/(auth)/verify-email", params: { email: form.getValues("identifier").includes("@") ? form.getValues("identifier").trim() : "" } })} />
      <View className="mt-1 rounded-2xl border border-brand-100 bg-brand-50 px-4 pb-1 pt-4">
        <Text className="text-center text-sm text-slate-600">First time here?</Text>
        <AuthLink label="Create your student account" icon="person-add-outline" disabled={loading} onPress={() => router.push("/(auth)/register")} />
      </View>
    </AuthScreen>
  );
}
