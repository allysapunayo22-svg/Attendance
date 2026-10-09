import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { router } from "expo-router";
import { AuthButton, AuthLink, AuthNotice, AuthScreen } from "../../src/components/AuthScreen";

export default function AccountHelpScreen() {
  const [error, setError] = useState(false);
  const configuredEmail = process.env.EXPO_PUBLIC_CAMPUS_SUPPORT_EMAIL?.trim();
  const email = configuredEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail) ? configuredEmail : null;
  return (
    <AuthScreen title="Account help" description="The CBEA office can help with student records and account access." footer={false}
      back={() => router.canGoBack() ? router.back() : router.replace("/(auth)/login")}>
      <View className="rounded-2xl border border-slate-200 bg-white p-5">
        <Text className="text-lg font-semibold text-slate-900">Contact the CBEA office</Text>
        <Text className="mt-2 text-sm leading-6 text-slate-600">Visit the CBEA office on campus if your student ID is not recognized, your school email is incorrect, or your account needs review.</Text>
        <Text className="mt-3 text-sm leading-6 text-slate-600">Bring your school ID and explain the message shown in the app. Never share your password, verification link, or reset link.</Text>
        {email ? <Text selectable className="mt-3 text-base font-semibold text-brand-700">{email}</Text> : null}
      </View>
      {email ? <AuthButton title="Email the CBEA office" onPress={() => {
        setError(false);
        void Linking.openURL(`mailto:${email}?subject=${encodeURIComponent("ClickIn account help")}`).catch(() => setError(true));
      }} /> : null}
      {error ? <AuthNotice title="Couldn’t open your email app" message="Copy the email address above into your email app, or visit the CBEA office." tone="error" /> : null}
      <AuthLink label="Reset my password" onPress={() => router.push("/(auth)/forgot-password")} />
      <AuthLink label="Resend my confirmation email" onPress={() => router.push("/(auth)/verify-email")} />
      <AuthLink label="Back to sign in" onPress={() => router.replace("/(auth)/login")} />
    </AuthScreen>
  );
}
