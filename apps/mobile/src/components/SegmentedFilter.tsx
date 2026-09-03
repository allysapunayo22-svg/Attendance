import { Pressable, ScrollView, Text, View } from "react-native";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-5">
      {options.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            className={`min-h-11 flex-row items-center rounded-full border px-5 shadow-sm ${active ? "border-brand-700 bg-brand-700" : "border-slate-100 bg-white"}`}
          >
            <Text className={`text-sm font-semibold ${active ? "text-white" : "text-slate-700"}`}>{item.label}</Text>
            {typeof item.count === "number" ? (
              <View className={`ml-2 rounded-full px-2 py-0.5 ${active ? "bg-white/20" : "bg-slate-100"}`}>
                <Text className={`text-xs font-bold ${active ? "text-white" : "text-slate-500"}`}>{item.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
