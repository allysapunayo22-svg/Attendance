import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { registerSchema, type RegisterInput } from "@attendance/validation";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { hasSeenWelcome } from "../../src/services/onboarding";
import { useAuthStore } from "../../src/stores/authStore";

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <Text className="mt-1 text-sm text-red-600">{message}</Text>;
}

export default function RegisterScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const register = useAuthStore((state) => state.register);
  const loading = useAuthStore((state) => state.loading);
  const storeError = useAuthStore((state) => state.error);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      studentId: "",
      fullName: "",
      schoolEmail: "",
      password: "",
      confirmPassword: "",
      acceptPrivacy: false
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await register(values);
      if (result === "signed_in") {
        const student = useAuthStore.getState().student;
        const seenWelcome = student ? await hasSeenWelcome(student.id) : true;
        router.replace(seenWelcome ? "/(student)" : "/welcome");
        return;
      }
      setSubmittedEmail(values.schoolEmail.trim().toLowerCase());
    } catch {
      // The auth store owns the visible error message.
    }
  });

  if (submittedEmail) {
    return (
      <View className="flex-1 justify-center bg-slate-50 px-5">
        <View className="items-center rounded-3xl bg-brand-900 p-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white">
            <Ionicons name="mail-outline" size={34} color="#0f766e" />
          </View>
          <Text className="mt-4 text-center text-2xl font-bold text-white">Confirm your school email</Text>
          <Text className="mt-2 text-center text-sm leading-6 text-brand-50">
            We found your CBEA roster record. Open the verification email sent to {submittedEmail}, then log in.
          </Text>
        </View>
        <View className="mt-5 gap-3">
          <PrimaryButton title="Back to Login" variant="secondary" onPress={() => router.replace("/(auth)/login")} />
          <Text className="text-center text-sm text-slate-500">
            Registration is only activated after your school email is confirmed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="px-5 py-10">
      <View className="mb-5 items-start">
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 60, height: 60 }}
          resizeMode="contain"
        />
      </View>
      <Text className="text-3xl font-bold text-slate-950">Create Account</Text>
      <Text className="mt-2 text-base leading-6 text-slate-600">
        Only students on the approved CSU Gonzaga CBEA roster can register.
      </Text>

      <View className="mt-6 rounded-3xl border border-brand-100 bg-brand-50 p-4">
        <Text className="font-bold text-brand-900">Verification required</Text>
        <Text className="mt-1 text-sm leading-5 text-brand-800">
          Your student ID and school email must match the CBEA approved list. Your school email must be confirmed before the account can be used.
        </Text>
      </View>

      <View className="mt-6 gap-4">
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">CSU Student ID</Text>
          <Controller
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="characters"
                className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950"
              />
            )}
          />
          <FieldError message={form.formState.errors.studentId?.message} />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Full name</Text>
          <Controller
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="words"
                className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950"
              />
            )}
          />
          <FieldError message={form.formState.errors.fullName?.message} />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">School email</Text>
          <Controller
            control={form.control}
            name="schoolEmail"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950"
              />
            )}
          />
          <FieldError message={form.formState.errors.schoolEmail?.message} />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Password</Text>
          <View className="flex-row items-center rounded-lg border border-slate-300 bg-white">
            <Controller
              control={form.control}
              name="password"
              render={({ field }) => (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry={!showPassword}
                  className="min-h-14 flex-1 px-4 text-base text-slate-950"
                />
              )}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} className="h-14 w-14 items-center justify-center">
              <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#334155" />
            </Pressable>
          </View>
          <FieldError message={form.formState.errors.password?.message} />
        </View>

        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Confirm password</Text>
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                secureTextEntry={!showPassword}
                className="min-h-14 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950"
              />
            )}
          />
          <FieldError message={form.formState.errors.confirmPassword?.message} />
        </View>

        <Controller
          control={form.control}
          name="acceptPrivacy"
          render={({ field }) => (
            <Pressable onPress={() => field.onChange(!field.value)} className="flex-row items-start gap-3 rounded-2xl bg-white p-4">
              <View className={`mt-0.5 h-6 w-6 items-center justify-center rounded-full ${field.value ? "bg-brand-700" : "border border-slate-300"}`}>
                {field.value ? <Ionicons name="checkmark" size={16} color="#ffffff" /> : null}
              </View>
              <Text className="flex-1 text-sm leading-5 text-slate-600">
                I confirm that my information is accurate and I accept the attendance privacy notice.
              </Text>
            </Pressable>
          )}
        />
        <FieldError message={form.formState.errors.acceptPrivacy?.message} />

        {storeError ? <Text className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{storeError}</Text> : null}

        <PrimaryButton title="Register" loading={loading} onPress={onSubmit} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/(auth)/login")}
        className="mt-6 w-full items-center justify-center py-2 active:opacity-70"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      >
        <Text className="text-center text-base font-semibold text-brand-700">
          Already registered? Log in
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/privacy")}
        className="mt-4 w-full items-center justify-center py-2 active:opacity-70"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      >
        <Text className="text-center text-sm text-slate-500">
          Privacy notice
        </Text>
      </Pressable>
    </ScrollView>
  );
}
