import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { registerSchema, type RegisterInput } from "@attendance/validation";
import { AuthField, PasswordGuidance } from "../../src/components/AuthField";
import { AuthButton, AuthLink, AuthNotice, AuthScreen } from "../../src/components/AuthScreen";
import { hasSeenWelcome } from "../../src/services/onboarding";
import { authFeedback } from "../../src/services/authFeedback";
import { useAuthStore } from "../../src/stores/authStore";
import { useOnlineStatus } from "../../src/hooks/useOnlineStatus";

const detailFields = ["studentId", "fullName", "schoolEmail"] as const;

export default function RegisterScreen() {
  const [step, setStep] = useState<1 | 2>(1);
  const online = useOnlineStatus();
  const pending = useRef(false);
  const { register, loading, error } = useAuthStore();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema), mode: "onBlur", shouldFocusError: false,
    defaultValues: { studentId: "", fullName: "", schoolEmail: "", password: "", confirmPassword: "", acceptPrivacy: false }
  });
  useEffect(() => {
    useAuthStore.setState({ error: null });
    const subscription = form.watch(() => {
      if (useAuthStore.getState().error) useAuthStore.setState({ error: null });
    });
    return () => subscription.unsubscribe();
  }, [form]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const fields = step === 1 ? detailFields : ["password", "confirmPassword"] as const;
      const firstError = fields.find((name) => form.getFieldState(name).invalid);
      if (firstError) form.setFocus(firstError);
    });
    return () => cancelAnimationFrame(frame);
  }, [step, form]);
  const password = form.watch("password");
  const confirmation = form.watch("confirmPassword");
  const feedback = error ? authFeedback(error) : null;

  async function next() {
    if (await form.trigger([...detailFields], { shouldFocus: true })) setStep(2);
  }
  const onSubmit = form.handleSubmit(async (values) => {
    if (!online || loading || pending.current) return;
    pending.current = true;
    try {
      const result = await register(values);
      if (result === "signed_in") {
        const student = useAuthStore.getState().student;
        router.replace(student && !(await hasSeenWelcome(student.id)) ? "/welcome" : "/(student)");
      } else {
        router.replace({ pathname: "/(auth)/verify-email", params: { email: values.schoolEmail.trim().toLowerCase(), sent: "1" } });
      }
    } catch { /* The auth store owns the visible error. */ }
    finally { pending.current = false; }
  }, (errors) => {
    const detailError = detailFields.find((name) => errors[name]);
    if (detailError) {
      setStep(1);
      return;
    }
    const firstError = errors.password ? "password" : errors.confirmPassword ? "confirmPassword" : null;
    if (firstError) form.setFocus(firstError);
  });

  return (
    <AuthScreen title={step === 1 ? "Create your account" : "Secure your account"}
      description={step === 1 ? "Use the student details registered with the CBEA office." : "Choose a password, then confirm your school email to activate your account."}
      back={() => { if (loading) return; if (step === 2) setStep(1); else router.replace("/(auth)/login"); }}>
      <View accessibilityLabel={`Step ${step} of 2: ${step === 1 ? "Student details" : "Account security"}`} className="mb-2 flex-row gap-3 border-b border-slate-100 pb-5">
        {(["Student details", "Account security"] as const).map((label, index) => (
          <View key={label} className="flex-1 gap-2">
            <View className={`h-8 w-8 items-center justify-center rounded-full ${index + 1 <= step ? "bg-brand-700" : "bg-slate-100"}`}>
              {index + 1 < step ? <Ionicons name="checkmark" size={18} color="#ffffff" />
                : <Text className={`text-sm font-bold ${index + 1 <= step ? "text-white" : "text-slate-500"}`}>{index + 1}</Text>}
            </View>
            <Text className={`text-xs font-semibold ${index + 1 <= step ? "text-brand-900" : "text-slate-500"}`}>{label}</Text>
            <View className={`h-1 rounded-full ${index + 1 <= step ? "bg-brand-700" : "bg-slate-100"}`} />
          </View>
        ))}
      </View>
      {step === 1 ? <>
        <Controller control={form.control} name="studentId" render={({ field }) => (
          <AuthField label="CSU student ID" ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.studentId?.message} hint="Enter it as shown on your school ID."
            autoCapitalize="characters" returnKeyType="next" onSubmitEditing={() => form.setFocus("fullName")} />
        )} />
        <Controller control={form.control} name="fullName" render={({ field }) => (
          <AuthField label="Full name" ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.fullName?.message} autoCapitalize="words" autoComplete="name" textContentType="name"
            returnKeyType="next" onSubmitEditing={() => form.setFocus("schoolEmail")} />
        )} />
        <Controller control={form.control} name="schoolEmail" render={({ field }) => (
          <AuthField label="School email" ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.schoolEmail?.message} hint="Must match the email on the approved student roster."
            autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
            returnKeyType="next" onSubmitEditing={() => void next()} />
        )} />
        <AuthButton title="Continue" onPress={() => void next()} />
      </> : <>
        <View className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <Text className="mb-2 text-xs font-bold tracking-widest text-brand-700">YOUR STUDENT DETAILS</Text>
          <Text className="font-semibold text-slate-900">{form.getValues("studentId")}</Text>
          <Text className="mt-1 text-sm text-slate-600">{form.getValues("schoolEmail")}</Text>
          <AuthLink label="Edit student details" align="left" disabled={loading} onPress={() => setStep(1)} />
        </View>
        <Controller control={form.control} name="password" render={({ field }) => (
          <AuthField label="Password" password ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.password?.message} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="next" onSubmitEditing={() => form.setFocus("confirmPassword")} editable={!loading} />
        )} />
        <Controller control={form.control} name="confirmPassword" render={({ field }) => (
          <AuthField label="Confirm password" password ref={field.ref} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={form.formState.errors.confirmPassword?.message} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword"
            returnKeyType="done" onSubmitEditing={() => void onSubmit()} editable={!loading} />
        )} />
        <PasswordGuidance password={password} confirmation={confirmation} />
        <View>
          <Controller control={form.control} name="acceptPrivacy" render={({ field }) => (
            <Pressable accessibilityRole="checkbox" accessibilityLabel="I confirm my information is accurate and accept the attendance privacy notice"
              accessibilityState={{ checked: field.value, disabled: loading }} disabled={loading}
              onPress={() => { field.onChange(!field.value); void form.trigger("acceptPrivacy"); }} className="min-h-14 flex-row items-start gap-3 py-3">
              <View className={`h-6 w-6 items-center justify-center rounded-md border ${field.value ? "border-brand-700 bg-brand-700" : "border-slate-400 bg-white"}`}>
                {field.value ? <Text className="font-bold text-white">✓</Text> : null}
              </View>
              <Text className="flex-1 text-sm leading-5 text-slate-700">I confirm my information is accurate and accept the attendance privacy notice.</Text>
            </Pressable>
          )} />
          <AuthLink label="Read the privacy notice" align="left" onPress={() => router.push("/privacy")} />
          {form.formState.errors.acceptPrivacy ? <Text accessibilityRole="alert" className="text-sm text-red-700">{form.formState.errors.acceptPrivacy.message}</Text> : null}
        </View>
        <AuthButton title="Create account" loading={loading} disabled={!online} onPress={onSubmit} />
      </>}
      {feedback ? <AuthNotice title={feedback.title} message={feedback.message} tone="error" /> : null}
      <AuthLink label="Already registered? Log in" disabled={loading} onPress={() => router.replace("/(auth)/login")} />
    </AuthScreen>
  );
}
