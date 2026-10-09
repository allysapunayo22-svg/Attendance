import { useMemo, useState } from "react";
import { Pressable, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../src/components/PrimaryButton";
import { markWelcomeSeen } from "../src/services/onboarding";
import { useAuthStore } from "../src/stores/authStore";

const slides = [
  {
    eyebrow: "Welcome",
    title: "CSU Gonzaga CBEA Attendance",
    body: "Track event attendance with school-approved student accounts, location checks, and clear attendance status.",
    icon: "school-outline"
  },
  {
    eyebrow: "How attendance works",
    title: "Verify once, then follow your status",
    body: "For each event, the app guides you through location, QR, and photo checks. If you lose connection, your encrypted record stays queued on this phone until it can sync.",
    icon: "shield-checkmark-outline"
  }
] as const;

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const student = useAuthStore((state) => state.student);
  const slide = slides[index] ?? slides[0];
  const isLast = index === slides.length - 1;
  const contentStyle = useMemo<ViewStyle>(() => ({ width: "100%", maxWidth: 620, alignSelf: "center" }), []);
  const iconSize = Math.min(88, Math.max(72, width * 0.2));

  async function finish() {
    if (student?.id) {
      await markWelcomeSeen(student.id);
    }
    router.replace("/(student)");
  }

  function next() {
    if (isLast) {
      void finish();
      return;
    }
    setIndex((value) => value + 1);
  }

  if (!student) {
    router.replace("/(auth)/login");
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-900" edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View className="flex-1 justify-between px-5 py-5" style={contentStyle}>
        <View>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold uppercase tracking-wide text-brand-100">ClickIn</Text>
            <Pressable onPress={() => void finish()} className="rounded-full bg-white/10 px-4 py-2 active:opacity-80">
              <Text className="text-sm font-semibold text-white">Skip</Text>
            </Pressable>
          </View>

          <View className="mt-6 flex-row gap-2">
            {slides.map((item, slideIndex) => (
              <Pressable key={item.title} onPress={() => setIndex(slideIndex)} className="h-2 flex-1 rounded-full bg-white/20">
                <View className={`h-2 rounded-full ${slideIndex <= index ? "bg-white" : "bg-transparent"}`} />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="items-center">
          <View className="items-center justify-center rounded-full bg-white" style={{ width: iconSize, height: iconSize }}>
            <Ionicons name={slide.icon} size={Math.round(iconSize * 0.44)} color="#0f766e" />
          </View>

          <Text className="mt-8 text-center text-sm font-bold uppercase tracking-wide text-brand-100">{slide.eyebrow}</Text>
          <Text className="mt-3 text-center text-4xl font-bold leading-tight text-white" adjustsFontSizeToFit numberOfLines={3}>
            {slide.title}
          </Text>
          <Text className="mt-4 text-center text-base leading-7 text-brand-50">{slide.body}</Text>

          <View className="mt-8 flex-row items-center gap-2">
            {slides.map((item, slideIndex) => (
              <View key={item.eyebrow} className={`h-2 rounded-full ${slideIndex === index ? "w-8 bg-white" : "w-2 bg-white/30"}`} />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <PrimaryButton
            title={isLast ? "Get Started" : "Next"}
            icon={<Ionicons name={isLast ? "checkmark" : "arrow-forward"} size={18} color="#ffffff" />}
            onPress={next}
          />
          {index > 0 ? (
            <PrimaryButton
              title="Back"
              variant="light"
              icon={<Ionicons name="arrow-back" size={18} color="#020617" />}
              onPress={() => setIndex((value) => Math.max(0, value - 1))}
            />
          ) : (
            <Text className="min-h-14 text-center text-sm leading-6 text-brand-100">
              Hi {student.full_name.split(" ")[0] || "Student"}, here is what you can do in the app.
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
