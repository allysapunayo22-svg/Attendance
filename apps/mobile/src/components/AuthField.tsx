import { forwardRef, useState } from "react";
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  hint?: string;
  password?: boolean;
}

export const AuthField = forwardRef<TextInput, AuthFieldProps>(function AuthField(
  { label, error, hint, password = false, ...props }, ref
) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  const icon = password ? "lock-closed-outline" : props.textContentType === "emailAddress" ? "mail-outline" : props.textContentType === "name" ? "person-outline" : "id-card-outline";
  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-slate-800">{label}</Text>
      <View className={`flex-row items-center rounded-2xl border ${error ? "border-red-400 bg-red-50" : focused ? "border-brand-700 bg-white" : "border-slate-200 bg-slate-50"}`}>
        <View pointerEvents="none" accessible={false} className="pl-4">
          <Ionicons name={icon} size={20} color={error ? "#b91c1c" : focused ? "#0f766e" : "#82918b"} />
        </View>
        <TextInput {...props} ref={ref} accessibilityLabel={label} accessibilityHint={error ?? hint}
          autoCorrect={false} secureTextEntry={password && !visible}
          onFocus={(event) => { setFocused(true); props.onFocus?.(event); }}
          onBlur={(event) => { setFocused(false); props.onBlur?.(event); }}
          placeholderTextColor="#8a9892"
          className="min-h-14 flex-1 px-3 text-base text-slate-950" />
        {password ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
            onPress={() => setVisible(!visible)} className="h-14 w-14 items-center justify-center">
            <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color="#475569" />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityRole="alert" className="mt-1 text-sm text-red-700">{error}</Text>
        : hint ? <Text className="mt-1 text-sm text-slate-500">{hint}</Text> : null}
    </View>
  );
});

export function PasswordGuidance({ password, confirmation }: { password: string; confirmation: string }) {
  return (
    <View className="gap-2 rounded-2xl bg-slate-50 p-3">
      <Text className={`text-sm ${password.length >= 8 ? "text-brand-700" : "text-slate-500"}`}>
        {password.length >= 8 ? "✓" : "○"} At least 8 characters
      </Text>
      {confirmation ? <Text accessibilityLiveRegion="polite" className={`text-sm ${password === confirmation ? "text-brand-700" : "text-slate-600"}`}>
        {password === confirmation ? "✓ Passwords match" : "○ Passwords must match"}
      </Text> : null}
    </View>
  );
}
