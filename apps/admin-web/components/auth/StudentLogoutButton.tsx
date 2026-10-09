"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { countOfflineAttendance } from "@/lib/student/offline/db";
import { localSessionOwnerId } from "@/lib/student/offline/session";
import { cancelOfflineSync } from "@/lib/student/offline/sync";
import { PENDING_QUEUE_STATES } from "@/lib/student/offline/types";

export function StudentLogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    const ownerId = await localSessionOwnerId();
    const pending = ownerId ? await countOfflineAttendance(ownerId, PENDING_QUEUE_STATES) : 0;
    if (pending && !window.confirm(`${pending} attendance ${pending === 1 ? "item is" : "items are"} still saved on this device. The queue will remain isolated to this account and resume when you sign in again. Log out now?`)) return;
    cancelOfflineSync();
    await supabase.auth.signOut();
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={() => void logout()} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition ${compact ? "bg-slate-100 text-slate-700 hover:bg-slate-200" : "bg-rose-600 text-white hover:bg-rose-700"}`}>
      <LogOut size={17} /> Log out
    </button>
  );
}
