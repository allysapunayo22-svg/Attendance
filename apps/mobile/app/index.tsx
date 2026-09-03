import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../src/stores/authStore";
import { hasSeenWelcome } from "../src/services/onboarding";

export default function SplashScreen() {
  const loading = useAuthStore((state) => state.loading);
  const student = useAuthStore((state) => state.student);

  useEffect(() => {
    let active = true;

    if (!loading) {
      if (!student) {
        router.replace("/(auth)/login");
        return;
      }

      void hasSeenWelcome(student.id).then((seen) => {
        if (active) {
          router.replace(seen ? "/(student)" : "/welcome");
        }
      });
    }

    return () => {
      active = false;
    };
  }, [loading, student]);

  return (
    <View className="flex-1 items-center justify-center bg-slate-950 px-8">
      <Image
        source={require("../assets/logo.png")}
        style={{ width: 96, height: 96 }}
        resizeMode="contain"
      />
      <Text className="mt-6 text-3xl font-bold text-white">Campus Attendance</Text>
      <Text className="mt-2 text-center text-base text-slate-400">Location-verified event attendance</Text>
    </View>
  );
}
