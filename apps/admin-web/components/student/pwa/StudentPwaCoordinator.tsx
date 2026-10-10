"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Cloud, Download, LoaderCircle, RefreshCw, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useBrowserOnline } from "@/lib/student/offline/connectivity";
import { getOfflineAttendanceForOwner, OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/student/offline/db";
import { localSessionOwnerId } from "@/lib/student/offline/session";
import { cancelOfflineSync, syncOfflineAttendance } from "@/lib/student/offline/sync";
import { nextAutomaticRetryAt } from "@/lib/student/offline/sync-core";
import { PENDING_QUEUE_STATES, type OfflineAttendanceRecord } from "@/lib/student/offline/types";

import { ConnectionToast } from "./ConnectionToast";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const INSTALL_DISMISSED_KEY = "clickin_pwa_install_dismissed_v1";

function installedStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && /safari/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function StudentPwaCoordinator() {
  const queryClient = useQueryClient();
  const online = useBrowserOnline();
  const ownerRef = useRef<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [records, setRecords] = useState<OfflineAttendanceRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(true);

  const refreshQueue = useCallback(async (requestedOwnerId = ownerId) => {
    if (!requestedOwnerId) {
      setRecords([]);
      return;
    }
    const nextRecords = await getOfflineAttendanceForOwner(requestedOwnerId);
    if (ownerRef.current === requestedOwnerId) setRecords(nextRecords);
  }, [ownerId]);

  const runSync = useCallback(async (manual = false) => {
    if (!ownerId || !browserIsReallyOnline()) return;
    const requestedOwnerId = ownerId;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncOfflineAttendance({ manual, ownerId: requestedOwnerId });
      if (ownerRef.current !== requestedOwnerId) return;
      const changed = result.synced + result.rejected + result.blocked + result.retrying + result.authenticationRequired;
      if (result.busy) setSyncMessage("Another ClickIn tab is already syncing this account.");
      else if (result.authenticationRequired) setSyncMessage("Sign in again with this account to resume saved attendance.");
      else if (changed) setSyncMessage(`${result.synced} synced · ${result.rejected} rejected · ${result.blocked} blocked`);
    } catch (error) {
      if (ownerRef.current === requestedOwnerId) setSyncMessage(error instanceof Error ? error.message : "Sync could not be completed.");
    } finally {
      if (ownerRef.current === requestedOwnerId) setSyncing(false);
      await refreshQueue(requestedOwnerId);
    }
  }, [ownerId, refreshQueue]);

  useEffect(() => {
    let authEventSeen = false;
    queueMicrotask(() => setInstallDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "true"));
    void localSessionOwnerId().then((id) => {
      if (authEventSeen) return;
      ownerRef.current = id;
      setOwnerId(id);
      if (id) void refreshQueue(id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      const id = session?.user.id ?? null;
      const previousOwnerId = ownerRef.current;
      if (previousOwnerId !== null && previousOwnerId !== id) {
        cancelOfflineSync();
        queryClient.clear();
        setRecords([]);
        setSyncMessage(null);
        setSyncing(false);
      }
      ownerRef.current = id;
      setOwnerId(id);
      void refreshQueue(id);
    });
    return () => data.subscription.unsubscribe();
  }, [queryClient, refreshQueue]);

  useEffect(() => {
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", beforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", beforeInstall);
  }, []);

  useEffect(() => {
    const queueChanged = (event: Event) => {
      const changedOwner = (event as CustomEvent<{ ownerId?: string }>).detail?.ownerId;
      if (!changedOwner || changedOwner === ownerId) void refreshQueue(ownerId);
    };
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, queueChanged);
    return () => window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, queueChanged);
  }, [ownerId, refreshQueue]);

  useEffect(() => {
    if (!ownerId || !online) return;
    queueMicrotask(() => void runSync(false));
    const foreground = () => {
      if (document.visibilityState === "visible") void runSync(false);
    };
    window.addEventListener("online", foreground);
    document.addEventListener("visibilitychange", foreground);
    return () => {
      window.removeEventListener("online", foreground);
      document.removeEventListener("visibilitychange", foreground);
    };
  }, [online, ownerId, runSync]);

  useEffect(() => {
    if (!ownerId || !online || syncing) return;
    const retryAt = nextAutomaticRetryAt(records);
    if (retryAt === null) return;
    const timer = window.setTimeout(() => void runSync(false), Math.max(0, retryAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [online, ownerId, records, runSync, syncing]);

  const pending = useMemo(() => records.filter((record) => PENDING_QUEUE_STATES.includes(record.state)), [records]);
  const rejected = records.filter((record) => record.state === "rejected");
  const blocked = records.filter((record) => record.state === "blocked_device");
  const authenticationRequired = records.filter((record) => record.state === "authentication_required");
  const showInstall = !installedStandalone() && !installDismissed && Boolean(installPrompt || isIosSafari());

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
    } else {
      setInstallHelp(true);
    }
  }

  function dismissInstall() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, "true");
    setInstallDismissed(true);
    setInstallHelp(false);
  }

  return (
    <div className={pending.length || blocked.length || syncMessage || authenticationRequired.length || rejected.length || showInstall ? "mb-5 space-y-3" : ""} aria-live="polite">
      <ConnectionToast />
      {pending.length || blocked.length ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-student-200 bg-student-50 px-4 py-3 text-sm text-slate-700">
        <div className="flex items-center gap-2"><Cloud size={18} /><span>{pending.length} attendance {pending.length === 1 ? "item" : "items"} waiting to sync</span></div>
        <Button type="button" className="min-h-9 px-3 py-1.5 text-xs" variant="outline" disabled={!online || syncing} onClick={() => void runSync(true)}>{syncing ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />} Sync now</Button>
      </section> : null}
      {syncMessage ? <p className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200">{syncMessage}</p> : null}
      {blocked.length ? <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"><ShieldAlert className="mt-0.5 shrink-0" size={17} /> Register this browser again before syncing {blocked.length} blocked attendance {blocked.length === 1 ? "item" : "items"}.</p> : null}
      {authenticationRequired.length ? <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200"><ShieldAlert className="mt-0.5 shrink-0" size={17} /> Sign in again with this account to resume {authenticationRequired.length} saved attendance {authenticationRequired.length === 1 ? "item" : "items"}.</p> : null}
      {rejected.length ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">{rejected.length} offline attendance {rejected.length === 1 ? "submission was" : "submissions were"} rejected by the server. Open this page online for the recorded reason.</p> : null}
      {showInstall ? <section className="relative rounded-2xl border border-blue-200 bg-blue-50 p-4 pr-12 text-sm text-blue-950"><button type="button" aria-label="Dismiss install guidance" onClick={dismissInstall} className="absolute right-3 top-3 rounded-full p-1 hover:bg-blue-100"><X size={16} /></button><div className="flex items-start gap-3"><Download className="mt-0.5 shrink-0" size={19} /><div><strong>Install ClickIn</strong><p className="mt-1 text-xs leading-5 text-blue-800">Install the student portal for quicker access and a reliable offline shell.</p>{installHelp ? <p className="mt-2 rounded-xl bg-white/70 p-3 text-xs leading-5">In Safari, tap Share, then choose <strong>Add to Home Screen</strong>.</p> : null}<Button type="button" className="mt-3 min-h-9 px-3 py-1.5 text-xs" onClick={() => void install()}>{installPrompt ? "Install app" : "Show iPhone steps"}</Button></div></div></section> : null}
    </div>
  );
}

function browserIsReallyOnline() {
  return typeof navigator !== "undefined" && navigator.onLine;
}
