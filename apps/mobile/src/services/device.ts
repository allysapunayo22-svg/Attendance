import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const DEVICE_KEY = "attendance_device_fingerprint";

export async function getOrCreateDeviceFingerprint() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      const existing = window.localStorage.getItem(DEVICE_KEY);
      if (existing) return existing;
    }
    const fingerprint = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `web:${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}:${Date.now()}:${Math.random()}`
    );
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(DEVICE_KEY, fingerprint);
    }
    return fingerprint;
  }

  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;

  const fingerprint = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Device.osBuildId ?? "unknown"}:${Device.modelName ?? "unknown"}:${Date.now()}:${Math.random()}`
  );
  await SecureStore.setItemAsync(DEVICE_KEY, fingerprint);
  return fingerprint;
}

export async function registerDevice(studentId: string) {
  const fingerprint = await getOrCreateDeviceFingerprint();

  // Check if this exact device fingerprint was already registered for this student
  const { data: existing } = await supabase
    .from("devices")
    .select("id, is_active")
    .eq("student_id", studentId)
    .eq("device_fingerprint", fingerprint)
    .maybeSingle();

  if (existing?.id) {
    if (existing.is_active) {
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return existing.id as string;
    }

    // Re-activating this device: first deactivate any other active device to satisfy idx_devices_one_active_per_student
    await supabase
      .from("devices")
      .update({ is_active: false })
      .eq("student_id", studentId)
      .neq("id", existing.id);

    await supabase
      .from("devices")
      .update({
        is_active: true,
        last_seen_at: new Date().toISOString(),
        platform: Platform.OS,
        device_name: Device.modelName ?? (Platform.OS === "web" ? "Web Browser" : "Mobile Device")
      })
      .eq("id", existing.id);

    return existing.id as string;
  }

  // Deactivate any previous active devices for this student so new device can become the single active device
  await supabase
    .from("devices")
    .update({ is_active: false })
    .eq("student_id", studentId);

  const { data, error } = await supabase
    .from("devices")
    .insert({
      student_id: studentId,
      device_fingerprint: fingerprint,
      platform: Platform.OS,
      device_name: Device.modelName ?? (Platform.OS === "web" ? "Web Browser" : "Mobile Device"),
      app_version: "0.1.0",
      is_active: true,
      last_seen_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error) {
    // If concurrent insert occurred or constraint triggered, fallback to any existing device ID for this student
    const { data: fallback } = await supabase
      .from("devices")
      .select("id")
      .eq("student_id", studentId)
      .maybeSingle();

    if (fallback?.id) return fallback.id as string;
    throw error;
  }

  return data.id as string;
}
