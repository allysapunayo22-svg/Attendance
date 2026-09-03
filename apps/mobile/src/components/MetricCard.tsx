import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function MetricCard({
  label,
  value,
  tone = "default",
  subtitle,
  icon
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn" | "danger";
  subtitle?: string;
  icon?: ReactNode;
}) {
  const color = tone === "good" ? "text-brand-700" : tone === "warn" ? "text-orange-700" : tone === "danger" ? "text-red-700" : "text-slate-950";
  const iconBg = tone === "good" ? "bg-brand-50" : tone === "warn" ? "bg-orange-50" : tone === "danger" ? "bg-red-50" : "bg-brand-50";
  return (
    <View className="min-w-[46%] flex-1 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-sm font-medium text-slate-500">{label}</Text>
        {icon ? <View className={`h-8 w-8 items-center justify-center rounded-full ${iconBg}`}>{icon as any}</View> : null}
      </View>
      <Text className={`mt-2 text-2xl font-bold ${color}`}>{value}</Text>
      {subtitle ? <Text className="mt-1 text-xs text-slate-400">{subtitle}</Text> : null}
    </View>
  );
}
