import { Text, View } from "react-native";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" className="bg-amber-100 px-4 py-2">
      <Text className="text-center text-sm font-medium text-amber-900">Offline mode. Attendance will sync when internet is available.</Text>
    </View>
  );
}
