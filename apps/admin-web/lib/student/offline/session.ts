import { supabase } from "@/lib/supabase";

export async function localSessionOwnerId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session?.user.id ?? null;
}

export async function trustedSessionOwnerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Your authenticated session is required to sync attendance.");
  return data.user.id;
}
