import { View } from "react-native";
import { clampPercentage } from "../utils/format";

export function ProgressBar({ value, trackClassName = "bg-slate-200", fillClassName = "bg-brand-700" }: { value: number; trackClassName?: string; fillClassName?: string }) {
  return (
    <View className={`h-3 overflow-hidden rounded-full ${trackClassName}`}>
      <View className={`h-full rounded-full ${fillClassName}`} style={{ width: `${clampPercentage(value)}%` }} />
    </View>
  );
}
