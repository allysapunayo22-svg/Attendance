import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Alert, Image, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { loginSchema, type LoginInput } from "@attendance/validation";
import { PrimaryButton } from "../../src/components/PrimaryButton";
import { hasSeenWelcome } from "../../src/services/onboarding";
import { supabase } from "../../src/services/supabase";
import { useAuthStore } from "../../src/stores/authStore";

function normalizeStudentId(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export default function LoginScreen() {
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((state) => state.login);
  const loading = useAuthStore((state) => state.loading);
  const storeError = useAuthStore((state) => state.error);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: ""
    }
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values.identifier.trim(), values.password);
      const student = useAuthStore.getState().student;
      const seenWelcome = student ? await hasSeenWelcome(student.id) : true;
      router.replace(seenWelcome ? "/(student)" : "/welcome");
    } catch {
      // The auth store owns the visible error message.
    }
  });

  async function resetPassword() {
    const identifier = form.getValues("identifier").trim();
    if (!identifier) {
      form.setError("identifier", { message: "Enter your student ID or email first." });
      return;
    }

    let email = identifier.toLowerCase();
    if (!identifier.includes("@")) {
      const { data, error } = await supabase.functions.invoke<{ email?: string; error?: string }>("resolve-student-login", {
        body: { identifier: normalizeStudentId(identifier) }
      });
      if (error || !data?.email) {
        Alert.alert("Unable to send reset", data?.error ?? error?.message ?? "No active account was found for this student ID.");
        return;
      }
      email = data.email;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert("Unable to send reset", error.message);
      return;
    }
    Alert.alert("Password reset sent", "Check your school email for the reset link.");
  }

  return (
    <View className="flex-1 justify-center bg-slate-50 px-5">
      <View className="mb-6 items-start">
        <Image
          source={require("../../assets/logo.png")}
          style={{ width: 68, height: 68 }}
          resizeMode="contain"
        />
      </View>
      <Text className="text-3xl font-bold text-slate-950">Campus Attendance</Text>
      <Text className="mt-2 text-base text-slate-600">Sign in with your CSU student ID or verified school email.</Text>

      <View className="mt-8 gap-4">
        <View>
          <Text className="mb-2 text-sm font-semibold text-slate-700">Student ID or email</Text>
          <Controller
            control={form.control}
            name="identifier"
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
          {form.formState.errors.identifier ? <Text className="mt-1 text-sm text-red-600">{form.formState.errors.identifier.message}</Text> : null}
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
          {form.formState.errors.password ? <Text className="mt-1 text-sm text-red-600">{form.formState.errors.password.message}</Text> : null}
        </View>

        {storeError ? <Text className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{storeError}</Text> : null}

        <PrimaryButton title="Log In" loading={loading} onPress={onSubmit} />
        <Pressable className="items-center py-3" onPress={() => void resetPassword()}>
          <Text className="text-sm font-semibold text-brand-700">Forgot password</Text>
        </Pressable>
      </View>

      <View className="mt-6 items-center rounded-3xl border border-brand-100 bg-white p-4">
        <Text className="text-center text-sm text-slate-600">New CBEA student?</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/(auth)/register")}
          className="mt-2 w-full items-center justify-center py-2 active:opacity-70"
          hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
        >
          <Text className="text-center text-base font-bold text-brand-700">
            Create verified student account
          </Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/privacy")}
        className="mt-8 w-full items-center justify-center py-3 active:opacity-70"
        hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }}
      >
        <Text className="text-center text-sm text-slate-500">
          Privacy notice
        </Text>
      </Pressable>
    </View>
  );
}
