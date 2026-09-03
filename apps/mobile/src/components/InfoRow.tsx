import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function InfoRow({ label, value, icon }: { label: string; value: ReactNode; icon?: ReactNode }) {
  return (
    <View className="flex-row items-start gap-3 py-2">
      {icon ? <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-slate-100">{icon as any}</View> : null}
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</Text>
        {typeof value === "string" || typeof value === "number" ? (
          <Text className="mt-1 text-sm font-medium text-slate-800">{value}</Text>
        ) : (
          <View className="mt-1">{value as any}</View>
        )}
      </View>
    </View>
  );
}
