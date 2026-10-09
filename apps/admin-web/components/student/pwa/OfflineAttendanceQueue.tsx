"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock3, CloudUpload, RefreshCw, ShieldAlert, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOfflineAttendanceForOwner, OFFLINE_QUEUE_CHANGED_EVENT } from "@/lib/student/offline/db";
import { localSessionOwnerId } from "@/lib/student/offline/session";
import { syncOfflineAttendance } from "@/lib/student/offline/sync";
import type { OfflineAttendanceRecord, OfflineQueueState } from "@/lib/student/offline/types";
import { useBrowserOnline } from "@/lib/student/offline/connectivity";
import { supabase } from "@/lib/supabase";

const labels: Record<OfflineQueueState, string> = {
  queued: "Waiting to sync",
  uploading_evidence: "Uploading evidence",
  submitting: "Submitting",
  retry_wait: "Sync failed — waiting to retry",
  authentication_required: "Sign in again to sync",
  blocked_device: "Device registration required",
  blocked_integrity: "Saved item needs support",
  rejected: "Rejected by server",
  synced: "Attendance recorded successfully"
};

export function OfflineAttendanceQueue() {
  const online = useBrowserOnline();
  const ownerRef = useRef<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [records, setRecords] = useState<OfflineAttendanceRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [renderedAt] = useState(() => new Date());

  const refresh = useCallback(async (id = ownerId) => {
    if (!id) return setRecords([]);
    const next = (await getOfflineAttendanceForOwner(id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (ownerRef.current === id) setRecords(next);
  }, [ownerId]);

  useEffect(() => {
    let currentOwner: string | null = null;
    let authEventSeen = false;
    const switchOwner = (id: string | null) => {
      currentOwner = id;
      ownerRef.current = id;
      setOwnerId(id);
      setRecords([]);
      setSyncing(false);
      if (id) void getOfflineAttendanceForOwner(id).then((next) => {
        if (currentOwner === id) setRecords(next.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      });
    };
    void localSessionOwnerId().then((id) => {
      if (!authEventSeen) switchOwner(id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventSeen = true;
      switchOwner(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const changed = (event: Event) => {
      if ((event as CustomEvent<{ ownerId?: string }>).detail?.ownerId === ownerId) void refresh(ownerId);
    };
    window.addEventListener(OFFLINE_QUEUE_CHANGED_EVENT, changed);
    return () => window.removeEventListener(OFFLINE_QUEUE_CHANGED_EVENT, changed);
  }, [ownerId, refresh]);

  if (!records.length) return null;

  async function syncNow() {
    if (!ownerId) return;
    const requestedOwnerId = ownerId;
    setSyncing(true);
    try {
      await syncOfflineAttendance({ manual: true, ownerId: requestedOwnerId });
    } finally {
      if (ownerRef.current === requestedOwnerId) setSyncing(false);
      await refresh(requestedOwnerId);
    }
  }

  const pending = records.some((record) => !["synced", "rejected"].includes(record.state));
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="offline-queue-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="offline-queue-title" className="font-extrabold text-slate-950">Saved on this device</h2><p className="mt-1 text-xs leading-5 text-slate-500">These records are isolated to your account. Only server-accepted items are final attendance.</p></div>{pending ? <Button type="button" className="min-h-9 px-3 py-1.5 text-xs" variant="outline" disabled={syncing || !online} onClick={() => void syncNow()}>{syncing ? <RefreshCw className="animate-spin" size={15} /> : <CloudUpload size={15} />} Sync now</Button> : null}</div>
      <div className="mt-4 space-y-3">{records.map((record) => <QueueRow key={record.id} record={record} renderedAt={renderedAt} />)}</div>
    </section>
  );
}

function QueueRow({ record, renderedAt }: { record: OfflineAttendanceRecord; renderedAt: Date }) {
  const stale = renderedAt.getTime() - Date.parse(record.payload.device_timestamp) > 2 * 60 * 60 * 1000;
  const blocked = ["blocked_device", "blocked_integrity", "authentication_required"].includes(record.state);
  const Icon = record.state === "synced" ? CheckCircle2 : record.state === "rejected" ? XCircle : blocked ? ShieldAlert : Clock3;
  const tone = record.state === "synced" ? "text-emerald-700 bg-emerald-50" : record.state === "rejected" ? "text-red-700 bg-red-50" : blocked || stale ? "text-amber-800 bg-amber-50" : "text-blue-700 bg-blue-50";
  return <article className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={18} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{record.eventTitle}</h3><span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase text-slate-600 ring-1 ring-slate-200">{record.mode === "time_in" ? "Check in" : "Check out"}</span></div><p className="mt-1 text-xs font-semibold text-slate-600">{labels[record.state]}</p>{stale && !["synced", "rejected"].includes(record.state) ? <p className="mt-1 text-xs text-amber-800">More than 2 hours old. The authoritative freshness policy may reject this item.</p> : null}{record.lastError ? <p className="mt-1 break-words text-xs leading-5 text-slate-500">{record.lastError}</p> : null}{record.evidenceOrphaned ? <p className="mt-1 text-xs text-amber-800">The private uploaded evidence could not be deleted and requires retention cleanup.</p> : null}</div></article>;
}
