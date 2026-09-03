import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type FloatingTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const VISIBLE_TAB_ROUTES = new Set(["index", "events/index", "attendance/index"]);

function TabIcon({ name, color, focused, compact }: { name: keyof typeof Ionicons.glyphMap; color: string | any; focused: boolean; compact: boolean }) {
  const slotSize = compact ? 44 : 48;
  const circleSize = compact ? 36 : 40;
  const iconSize = compact ? 19 : 21;

  return (
    <View
      style={{
        width: slotSize,
        height: slotSize,
        alignItems: "center",
        justifyContent: "center",
        overflow: "visible"
      }}
    >
      <View
        style={{
          width: circleSize,
          height: circleSize,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: focused ? "#0f766e" : "transparent",
          borderWidth: 0,
          shadowColor: "#0f172a",
          shadowOpacity: focused ? 0.16 : 0,
          shadowRadius: focused ? 10 : 0,
          shadowOffset: { width: 0, height: 4 },
          elevation: focused ? 8 : 0
        }}
      >
        <Ionicons name={name} color={focused ? "#ffffff" : color} size={iconSize} />
      </View>
    </View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: FloatingTabBarProps) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const compactTabs = width < 380;
  const horizontalMargin = compactTabs ? 20 : 24;
  const tabBarWidth = Math.min(width - horizontalMargin * 2, compactTabs ? 296 : 328, width * 0.86);
  const bottomOffset = Math.max(8, insets.bottom + 8);
  const barHeight = compactTabs ? 62 : 66;

  const visibleRoutes = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => VISIBLE_TAB_ROUTES.has(route.name));
  const tabItemWidth = tabBarWidth / Math.max(visibleRoutes.length, 1);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: bottomOffset,
        alignItems: "center"
      }}
    >
      <View
        style={{
          width: tabBarWidth,
          maxWidth: 340,
          height: barHeight,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: compactTabs ? 3 : 4,
          paddingBottom: compactTabs ? 3 : 4,
          paddingHorizontal: compactTabs ? 6 : 8,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.74)",
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.92)",
          elevation: 10,
          shadowColor: "#0f172a",
          shadowOpacity: 0.1,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 }
        }}
      >
        {visibleRoutes.map(({ route, index }) => {
          const options = descriptors[route.key]?.options;
          if (!options) return null;

          const focused = state.index === index;
          const color = focused ? "#0f766e" : "#64748b";
          const label = typeof options.tabBarLabel === "string" ? options.tabBarLabel : typeof options.title === "string" ? options.title : route.name;

          function onPress() {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={{
                width: tabItemWidth,
                height: "100%",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <View
                style={{
                  width: compactTabs ? 44 : 48,
                  height: compactTabs ? 44 : 48,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {options.tabBarIcon?.({ focused, color, size: compactTabs ? 19 : 21 }) as any}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: compactTabs ? -7 : -6,
                  color,
                  fontSize: 10,
                  fontWeight: "800",
                  textAlign: "center"
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function StudentTabs() {
  const { width } = useWindowDimensions();
  const compactTabs = width < 380;

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0f766e",
        tabBarInactiveTintColor: "#64748b",
        tabBarShowLabel: true
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon name="home-outline" color={color} focused={focused} compact={compactTabs} />
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title: "Events",
          tabBarIcon: ({ color, focused }) => <TabIcon name="calendar-outline" color={color} focused={focused} compact={compactTabs} />
        }}
      />
      <Tabs.Screen
        name="attendance/index"
        options={{
          title: "History",
          tabBarIcon: ({ color, focused }) => <TabIcon name="receipt-outline" color={color} focused={focused} compact={compactTabs} />
        }}
      />
      <Tabs.Screen name="scan/index" options={{ href: null, title: "Scan Attendance" }} />
      <Tabs.Screen
        name="notifications/index"
        options={{
          href: null,
          title: "Notifications"
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          href: null,
          title: "Profile"
        }}
      />
      <Tabs.Screen name="attendance/progress" options={{ href: null }} />
      <Tabs.Screen name="attendance/[localId]/index" options={{ href: null, title: "Attendance Details" }} />
      <Tabs.Screen name="announcements/index" options={{ href: null, title: "Announcements" }} />
    </Tabs>
  );
}
