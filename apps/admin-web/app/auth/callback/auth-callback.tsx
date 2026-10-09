"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { isRecoveryCallback } from "@/lib/auth/recovery";
import { supabase } from "@/lib/supabase";

type CallbackState = "checking" | "error";

export default function AuthCallback() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>("checking");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;

    void (async () => {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const type = query.get("type") ?? fragment.get("type");
      const code = query.get("code");
      let userId: string | undefined;

      if (isRecoveryCallback(type, code)) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code!);
        if (error || !data.user) throw new Error("invalid_recovery");
        userId = data.user.id;
      } else if (type === "recovery") {
        // Legacy implicit-flow values remain in the URL fragment, which is not
        // transmitted to the server. Clear it immediately after establishing
        // the authenticated recovery session.
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        if (!accessToken || !refreshToken) throw new Error("invalid_recovery");
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        window.history.replaceState(null, "", "/auth/callback");
        if (error || !data.user) throw new Error("invalid_recovery");
        userId = data.user.id;
      } else {
        throw new Error("invalid_recovery");
      }

      const marked = await fetch("/auth/recovery/mark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (!marked.ok) throw new Error("invalid_recovery");
      router.replace("/reset-password");
      router.refresh();
    })().catch(async () => {
      await supabase.auth.signOut({ scope: "local" });
      if (active) setState("error");
    });

    return () => { active = false; };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#070f26] via-[#0b1633] to-[#040817] p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/85 p-8 text-center shadow-2xl">
        {state === "checking" ? (
          <>
            <LoaderCircle aria-label="Verifying recovery link" className="mx-auto animate-spin text-blue-300" size={32} />
            <h1 className="mt-4 text-xl font-bold text-white">Verifying your reset link</h1>
            <p className="mt-2 text-sm text-slate-400">Please wait while the secure recovery session is confirmed.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">Reset link unavailable</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-slate-300">This password reset link is invalid or expired.</p>
            <Link href="/forgot-password" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">Request a new link</Link>
          </>
        )}
      </div>
    </main>
  );
}
