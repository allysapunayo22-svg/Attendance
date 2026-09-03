import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

function welcomeKey(studentId: string) {
  return `attendance_welcome_seen_${studentId}`;
}

export async function hasSeenWelcome(studentId: string) {
  try {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(welcomeKey(studentId)) === "true"
        : false;
    }
    return (await SecureStore.getItemAsync(welcomeKey(studentId))) === "true";
  } catch {
    return false;
  }
}

export async function markWelcomeSeen(studentId: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(welcomeKey(studentId), "true");
    }
    return;
  }
  await SecureStore.setItemAsync(welcomeKey(studentId), "true");
}
