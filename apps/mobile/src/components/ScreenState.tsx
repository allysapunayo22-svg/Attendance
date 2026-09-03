import { ActivityIndicator, Text, View } from "react-native";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center p-8">
      <ActivityIndicator color="#0f766e" />
      <Text className="mt-3 text-sm text-slate-600">{label}</Text>
    </View>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View className="items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-8">
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      {body ? <Text className="mt-2 text-center text-sm text-slate-500">{body}</Text> : null}
    </View>
  );
}
