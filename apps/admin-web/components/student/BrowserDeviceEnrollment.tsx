"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, MonitorSmartphone, RefreshCw } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  browserDeviceStatusCopy,
  canBeginAttendance,
  registerCurrentBrowser,
  resolveCurrentBrowserDevice,
  getStoredBrowserIdentity,
  type BrowserDeviceState
} from "@/lib/student/browser-device";
import { useBrowserOnline } from "@/lib/student/offline/connectivity";

const initialState: BrowserDeviceState = {
  status: "no_browser_identity",
  deviceId: null,
  anotherDeviceActive: false
};

export function BrowserDeviceEnrollment({ onReadyChange, offlineCaptureAllowed = false }: { onReadyChange?: (ready: boolean) => void; offlineCaptureAllowed?: boolean }) {
  const online = useBrowserOnline();
  const [deviceState, setDeviceState] = useState(initialState);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineProvisional, setOfflineProvisional] = useState(false);

  const applyState = useCallback((nextState: BrowserDeviceState) => {
    setDeviceState(nextState);
    onReadyChange?.(canBeginAttendance(nextState));
  }, [onReadyChange]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!online && offlineCaptureAllowed && getStoredBrowserIdentity()) {
      setOfflineProvisional(true);
      onReadyChange?.(true);
      setLoading(false);
      return;
    }
    try {
      setOfflineProvisional(false);
      applyState(await resolveCurrentBrowserDevice(supabase));
    } catch (caught) {
      if (offlineCaptureAllowed && getStoredBrowserIdentity()) {
        setOfflineProvisional(true);
        onReadyChange?.(true);
      } else {
        setError(caught instanceof Error ? caught.message : "Unable to verify this browser.");
        onReadyChange?.(false);
      }
    } finally {
      setLoading(false);
    }
  }, [applyState, offlineCaptureAllowed, onReadyChange, online]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
  }, [refresh]);

  async function confirmRegistration() {
    setRegistering(true);
    setError(null);
    try {
      applyState(await registerCurrentBrowser(supabase));
      setConfirming(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to register this browser.");
    } finally {
      setRegistering(false);
    }
  }

  const copy = browserDeviceStatusCopy(deviceState.status, deviceState.anotherDeviceActive);
  const active = canBeginAttendance(deviceState) || offlineProvisional;
  const icon = loading ? <LoaderCircle className="animate-spin" size={20} /> : active ? <CheckCircle2 size={20} /> : error ? <AlertCircle size={20} /> : <MonitorSmartphone size={20} />;

  return (
    <section aria-labelledby="browser-device-title" className="rounded-3xl border border-slate-200/80 bg-white p-5 text-slate-950 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${active ? "bg-emerald-100 text-emerald-700" : error ? "bg-red-100 text-red-700" : "bg-teal-50 text-teal-700"}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h2 id="browser-device-title" className="font-extrabold">Attendance device</h2>
          <p className="mt-1 text-sm font-bold text-slate-800" role="status" aria-live="polite">{loading ? "Checking this browser…" : offlineProvisional ? "Saved browser identity available" : error ? "Browser verification failed" : copy.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">{offlineProvisional ? "This browser will be reverified with the server before queued attendance is submitted." : error ?? copy.description}</p>
        </div>
      </div>

      {!loading && !active ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Registration required before attendance.</strong> Registering this browser makes it your active attendance device. Your currently active phone or browser will be deactivated.</div> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {!loading && !active && online ? <Button type="button" onClick={() => setConfirming(true)}>Register this browser</Button> : null}
        <Button type="button" variant="outline" disabled={loading || registering || !online} onClick={() => void refresh()}><RefreshCw size={16} /> Check status</Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Register this browser for attendance?"
        description="Attendance requires a registered device. This browser will become your only active attendance device, and your currently active phone or browser will be deactivated."
        confirmLabel="Register this browser"
        busy={registering}
        onCancel={() => setConfirming(false)}
        onConfirm={() => void confirmRegistration()}
      />
    </section>
  );
}
