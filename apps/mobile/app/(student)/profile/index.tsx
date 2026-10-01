import { Alert, Image, Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { InfoRow } from "../../../src/components/InfoRow";
import { PrimaryButton } from "../../../src/components/PrimaryButton";
import { SectionHeader } from "../../../src/components/SectionHeader";
import { StatusBadge } from "../../../src/components/StatusBadge";
import { useOnlineStatus } from "../../../src/hooks/useOnlineStatus";
import { useAuthStore } from "../../../src/stores/authStore";
import { supabase } from "../../../src/services/supabase";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const student = useAuthStore((state) => state.student);
  const deviceId = useAuthStore((state) => state.deviceId);
  const logout = useAuthStore((state) => state.logout);
  const online = useOnlineStatus();
  const academicQuery = useQuery({
    queryKey: ["academic-profile", student?.course_id, student?.section_id],
    enabled: Boolean(student),
    queryFn: async () => {
      const [courseResult, sectionResult] = await Promise.all([
        student?.course_id ? supabase.from("courses").select("code,name").eq("id", student.course_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        student?.section_id ? supabase.from("sections").select("name").eq("id", student.section_id).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);
      if (courseResult.error) throw courseResult.error;
      if (sectionResult.error) throw sectionResult.error;
      return { course: courseResult.data, section: sectionResult.data };
    }
  });
  const contentStyle = { width: "100%", maxWidth: 620, alignSelf: "center" } as const;

  const studentInitials = student?.full_name
    ? student.full_name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("")
    : "ST";

  function handleLogout() {
    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out of your student account?")) {
        void logout().then(() => router.replace("/(auth)/login"));
      }
      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your student account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/(auth)/login");
          }
        }
      ]
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          gap: 16,
          paddingTop: Math.max(insets.top + 10, 20),
          paddingBottom: Math.max(180, insets.bottom + 100)
        }}
      >
        {/* Top Navigation Bar with Back Button */}
        <View className="flex-row items-center justify-between pb-1" style={contentStyle}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            className="h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200/80 shadow-sm active:bg-slate-100"
          >
            <Ionicons name="arrow-back" size={20} color="#0f172a" />
          </Pressable>
          <Text className="text-base font-bold text-slate-900">Student Profile</Text>
          <View className="h-10 w-10" />
        </View>

        {/* Profile Card with Initials / Photo */}
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={contentStyle}>
          <View className="flex-row items-center gap-4">
            {student?.profile_photo_path ? (
              <Image
                source={{ uri: student.profile_photo_path }}
                className="h-20 w-20 rounded-full bg-slate-100"
              />
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand-900 shadow-sm">
                <Text className="text-2xl font-black text-white tracking-wider">{studentInitials}</Text>
              </View>
            )}
            <View className="min-w-0 flex-1">
              <Text className="text-xl font-bold text-slate-950" numberOfLines={1}>{student?.full_name}</Text>
              <Text className="mt-0.5 text-xs font-semibold text-slate-500">Student ID: {student?.student_id}</Text>
              <View className="mt-2.5 flex-row items-center gap-2">
                <StatusBadge status={student?.is_active ? "verified" : "rejected"} />
                <View className="rounded-full bg-brand-50 px-2.5 py-0.5 border border-brand-200">
                  <Text className="text-[11px] font-bold text-brand-800">CBEA Enrolled</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Academic Information with resolved names */}
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={contentStyle}>
          <SectionHeader title="Academic Information" />
          <View className="mt-2">
            <InfoRow
              label="Course & Program"
              value={academicQuery.isLoading ? "Loading…" : academicQuery.data?.course ? `${academicQuery.data.course.name} (${academicQuery.data.course.code})` : student?.course_id ? "Course name unavailable" : "Not assigned"}
              icon={<Ionicons name="school-outline" size={16} color="#0f766e" />}
            />
            <InfoRow
              label="Section"
              value={academicQuery.isLoading ? "Loading…" : academicQuery.data?.section?.name ?? (student?.section_id ? "Section name unavailable" : "Not assigned")}
              icon={<Ionicons name="people-outline" size={16} color="#0f766e" />}
            />
            <InfoRow
              label="Year level"
              value={student?.year_level ? `Year ${student.year_level}` : "Not assigned"}
              icon={<Ionicons name="ribbon-outline" size={16} color="#0f766e" />}
            />
            <InfoRow
              label="Student Email"
              value={student?.email ?? "Not available"}
              icon={<Ionicons name="mail-outline" size={16} color="#0f766e" />}
            />
          </View>
        </View>

        {/* Device & Security Information */}
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={contentStyle}>
          <SectionHeader
            title="Registered Device"
            action={<StatusBadge status={deviceId ? "verified" : "rejected"} />}
          />
          <View className="mt-2">
            <InfoRow
              label="Device Status"
              value={deviceId ? "Registered to your account" : "Not bound"}
              icon={<Ionicons name="shield-checkmark-outline" size={16} color="#0f766e" />}
            />
            <InfoRow
              label="Device Fingerprint"
              value={
                <Text className="text-xs font-mono text-slate-600">
                  {deviceId ? `${deviceId.slice(0, 10)}...${deviceId.slice(-6)}` : "Pending registration"}
                </Text>
              }
              icon={<Ionicons name="phone-portrait-outline" size={16} color="#0f766e" />}
            />
            <InfoRow
              label="Connection"
              value={online ? "Online (Connected)" : "Offline (Local mode)"}
              icon={<Ionicons name={online ? "wifi-outline" : "cloud-offline-outline"} size={16} color="#0f766e" />}
            />
          </View>
        </View>

        {/* Notification Settings */}
        <View className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={contentStyle}>
          <SectionHeader title="Notification Preferences" />
          <Text className="mt-2 text-sm leading-5 text-slate-600">Event, attendance, and appeal notifications follow this device’s system notification settings.</Text>
          <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} className="mt-4 min-h-12 flex-row items-center justify-center rounded-full bg-brand-50"><Ionicons name="settings-outline" size={18} color="#0f766e" /><Text className="ml-2 font-semibold text-brand-800">Open Device Settings</Text></Pressable>
        </View>

        {/* Actions & Logout */}
        <View className="gap-3 pt-2" style={contentStyle}>
          <PrimaryButton
            title="Submit Absence or Appeal"
            variant="secondary"
            icon={<Ionicons name="document-text-outline" size={18} color="#0f766e" />}
            onPress={() => router.push("/appeal")}
          />
          <PrimaryButton
            title="Privacy Notice & Terms"
            variant="light"
            icon={<Ionicons name="shield-outline" size={18} color="#0f172a" />}
            onPress={() => router.push("/privacy")}
          />
          <PrimaryButton
            title="Log Out"
            variant="danger"
            icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}
