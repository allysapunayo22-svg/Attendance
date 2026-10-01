import * as Linking from "expo-linking";
import { createClient } from "@supabase/supabase-js";

export function authRedirectUrl() {
  return Linking.createURL("auth-callback");
}

// Email links must not replace a student's attendance session or sign them in
// before the recovery flow is complete. This client only lives on that screen.
export function createAuthLinkClient() {
  return createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { storageKey: "campus-attendance-email-link", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
