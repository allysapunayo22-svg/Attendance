import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

type ExpoNotifications = typeof import("expo-notifications");

let notificationsModule: ExpoNotifications | null | undefined;

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

async function loadNotifications() {
  if (isExpoGo() || Platform.OS === "web") {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false
    })
  });

  notificationsModule = Notifications;
  return notificationsModule;
}

export async function registerPushToken(userId: string) {
  const Notifications = await loadNotifications();
  if (!Notifications) return null;

  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return null;

  const token = await Notifications.getExpoPushTokenAsync();
  const { error } = await supabase.from("push_tokens").upsert({
    user_id: userId,
    token: token.data,
    provider: "expo",
    platform: Platform.OS,
    is_active: true
  });

  if (error) throw error;
  return token.data;
}
