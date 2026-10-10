"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { isRecoveryCallback } from "@/lib/auth/recovery";
import { supabase } from "@/lib/supabase";

type CallbackState = "checking" | "recovery_error" | "registration_error";

export default function AuthCallback() {
  const router = useRouter();
  const started = useRef(false);
  const [state, setState] = useState<CallbackState>("checking");
  const [registrationError, setRegistrationError] = useState("Your student registration could not be activated. Contact the CBEA administrator.");

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
      } else if (type === "signup") {
        let signupUserId: string;
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error || !data.user) throw new Error("invalid_signup");
          signupUserId = data.user.id;
        } else {
          const accessToken = fragment.get("access_token");
          const refreshToken = fragment.get("refresh_token");
          if (!accessToken || !refreshToken) throw new Error("invalid_signup");
          const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error || !data.user) throw new Error("invalid_signup");
          signupUserId = data.user.id;
        }
        window.history.replaceState(null, "", "/auth/callback?type=signup");

        const { data: profile } = await supabase.from("student_profiles").select("id,is_active").eq("user_id", signupUserId).maybeSingle();
        if (profile?.is_active) {
          router.replace("/");
          router.refresh();
          return;
        }
        const { data: request } = await supabase.from("student_registration_requests").select("status,reason").eq("auth_user_id", signupUserId).maybeSingle();
        throw new Error(request?.reason ?? "Your email was confirmed, but an active student profile could not be created.");
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
    })().catch(async (error) => {
      await supabase.auth.signOut({ scope: "local" });
      if (!active) return;
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      if ((query.get("type") ?? fragment.get("type")) === "signup") {
        setRegistrationError(error instanceof Error && error.message !== "invalid_signup" ? error.message : "This confirmation link is invalid or expired. Request a new account confirmation from the CBEA office.");
        setState("registration_error");
      } else {
        setState("recovery_error");
      }
    });

    return () => { active = false; };
  }, [router]);

  return (
    <main className="clickin-auth flex min-h-dvh items-center justify-center bg-student-50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-student-200 bg-white p-8 text-center shadow-sm">
        {state === "checking" ? (
          <>
            <LoaderCircle aria-label="Verifying secure link" className="mx-auto animate-spin text-student-700" size={32} />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Verifying your secure link</h1>
            <p className="mt-2 text-sm text-slate-600">Please wait while ClickIn confirms your request.</p>
          </>
        ) : state === "registration_error" ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Registration needs attention</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">{registrationError}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/register" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-student-700 px-5 text-sm font-semibold text-white hover:bg-student-800">Try registration again</Link><Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-student-200 px-5 text-sm font-semibold text-student-700 hover:bg-student-50">Back to sign in</Link></div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">Reset link unavailable</h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-slate-600">This password reset link is invalid or expired.</p>
            <Link href="/forgot-password" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-student-700 px-5 text-sm font-semibold text-white hover:bg-student-800">Request a new link</Link>
          </>
        )}
      </div>
    </main>
  );
}
