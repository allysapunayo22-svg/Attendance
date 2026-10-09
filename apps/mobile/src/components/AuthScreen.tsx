import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { PrimaryButton } from "./PrimaryButton";
import type { ComponentProps } from "react";

export function AuthScreen({ title, description, children, back, footer = true }: {
  title: string;
  description: string;
  children: ViewProps["children"];
  back?: () => void;
  footer?: boolean;
}) {
  const online = useOnlineStatus();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f5f3" }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 24 }}>
          <View className="mx-auto w-full max-w-lg">
            <View style={{ backgroundColor: "#103f39", borderRadius: 28, overflow: "hidden" }}>
              <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={{ position: "absolute", top: -70, right: -90, width: 260, height: 260, borderRadius: 130, borderWidth: 36, borderColor: "#1c5148" }} />
              <View style={{ padding: 24, paddingBottom: 44 }}>
                <View className="mb-6 flex-row items-center gap-3">
                  {back ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={back}
                    className="h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 active:opacity-70">
                    <Ionicons name="arrow-back" size={21} color="#ffffff" />
                  </Pressable> : <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
                    <Image source={require("../../assets/logo.png")} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityLabel="School logo" />
                  </View>}
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-white">ClickIn</Text>
                    <Text className="mt-1 text-xs text-brand-100">CSU Gonzaga · CBEA</Text>
                  </View>
                </View>
                <Text className="mb-2 text-xs font-bold tracking-widest text-brand-100">STUDENT PORTAL</Text>
                <Text accessibilityRole="header" className="text-3xl font-bold tracking-tight text-white">{title}</Text>
                <Text className="mt-3 text-sm leading-6 text-brand-100">{description}</Text>
              </View>
            </View>
            <View style={{ marginTop: -22, marginHorizontal: 8, padding: 20, borderRadius: 24, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e3ece7", shadowColor: "#123b32", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 20, elevation: 3 }}>
              {!online ? <AuthNotice title="You’re offline" message="Connect to the internet to continue. Your entries will stay here." /> : null}
              <View className="gap-4">{children}</View>
            </View>
            {footer ? (
              <View className="mt-5 px-4">
                <AuthLink label="Need help? Contact the CBEA office" icon="help-circle-outline" onPress={() => router.push("/(auth)/help")} />
                <AuthLink label="Privacy notice" icon="shield-checkmark-outline" muted onPress={() => router.push("/privacy")} />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthButton(props: ComponentProps<typeof PrimaryButton>) {
  return <PrimaryButton {...props} style={(state) => [{ borderRadius: 16, minHeight: 56 }, typeof props.style === "function" ? props.style(state) : props.style]}
    icon={props.icon ?? <Ionicons name="arrow-forward" size={18} color={props.variant === "light" ? "#103f39" : "#ffffff"} />} />;
}

export function AuthLink({ label, onPress, disabled = false, align = "center", icon, muted = false }: {
  label: string; onPress: () => void; disabled?: boolean; align?: "left" | "center" | "right";
  icon?: keyof typeof Ionicons.glyphMap; muted?: boolean;
}) {
  const color = disabled ? "#94a3b8" : muted ? "#64748b" : "#0f766e";
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      className={`min-h-12 flex-row items-center gap-2 py-3 active:opacity-60 ${align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center"}`}>
      {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
      <Text style={{ color, flexShrink: 1, textAlign: align === "center" ? "center" : align, fontSize: 13, fontWeight: "600", lineHeight: 20 }}>{label}</Text>
    </Pressable>
  );
}

export function AuthNotice({ title, message, tone = "info" }: { title: string; message: string; tone?: "info" | "error" | "success" }) {
  const icon = tone === "error" ? "alert-circle-outline" : tone === "success" ? "checkmark-circle-outline" : "information-circle-outline";
  return (
    <View accessibilityRole={tone === "error" ? "alert" : "text"} accessibilityLiveRegion="polite"
      className={`mb-2 flex-row items-start gap-3 rounded-2xl border p-4 ${tone === "error" ? "border-red-100 bg-red-50" : tone === "success" ? "border-brand-100 bg-brand-50" : "border-amber-100 bg-amber-50"}`}>
      <Ionicons name={icon} size={21} color={tone === "error" ? "#b91c1c" : tone === "success" ? "#0f766e" : "#92400e"} />
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${tone === "error" ? "text-red-800" : "text-slate-900"}`}>{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-slate-600">{message}</Text>
      </View>
    </View>
  );
}
