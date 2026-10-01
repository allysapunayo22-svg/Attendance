import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from "react-native";

interface PrimaryButtonProps extends PressableProps {
  title: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "light";
  className?: string;
  icon?: ReactNode;
}

export function PrimaryButton({ title, loading, disabled, variant = "primary", className = "", icon, ...props }: PrimaryButtonProps) {
  const palette =
    variant === "danger"
      ? "bg-red-600"
      : variant === "secondary"
        ? "bg-slate-900"
        : variant === "light"
          ? "bg-white"
          : "bg-brand-700";
  const labelColor = variant === "light" ? "text-slate-950" : "text-white";

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? title}
      accessibilityState={{ ...props.accessibilityState, disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      className={`min-h-14 items-center justify-center rounded-full px-5 active:opacity-80 ${disabled || loading ? "bg-slate-300" : palette} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "light" ? "#020617" : "#ffffff"} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon as any}
          <Text className={`text-base font-semibold ${labelColor}`}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
