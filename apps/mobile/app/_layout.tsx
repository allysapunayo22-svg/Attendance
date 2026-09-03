import "../global.css";
import { useEffect, useMemo } from "react";
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { OfflineBanner } from "../src/components/OfflineBanner";
import { useAuthStore } from "../src/stores/authStore";
import { useOnlineStatus } from "../src/hooks/useOnlineStatus";
import { useRealtimeEvents } from "../src/hooks/useRealtimeEvents";
import { syncPendingAttendance } from "../src/services/syncQueue";

function SyncOnReconnect() {
  const online = useOnlineStatus();

  useEffect(() => {
    if (online) {
      void syncPendingAttendance();
    }
  }, [online]);

  return null;
}

function RealtimeEventSync() {
  useRealtimeEvents();
  return null;
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <OfflineBanner />
        <SyncOnReconnect />
        <RealtimeEventSync />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="event/[id]/index" options={{ headerShown: true, title: "Event Details" }} />
          <Stack.Screen name="check-in/[eventId]/index" options={{ headerShown: true, title: "Time In" }} />
          <Stack.Screen name="check-out/[eventId]/index" options={{ headerShown: true, title: "Time Out" }} />
          <Stack.Screen name="appeal/index" options={{ headerShown: true, title: "Appeal" }} />
          <Stack.Screen name="privacy/index" options={{ headerShown: true, title: "Privacy" }} />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
