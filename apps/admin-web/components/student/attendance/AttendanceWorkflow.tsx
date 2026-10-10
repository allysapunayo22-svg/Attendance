"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Event, VerificationResult } from "@attendance/types";
import { AlertCircle, Camera, CheckCircle2, LoaderCircle, MapPin, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canBeginAttendance, resolveCurrentBrowserDevice } from "@/lib/student/browser-device";
import { getCurrentBrowserLocation, isLocationAccurate, isLocationStale, type BrowserLocation } from "@/lib/student/attendance/geolocation";
import {
  AttendanceTransportError,
  attendanceEvidencePath,
  authenticatedUserId,
  createLogicalAttempt,
  deriveAttendanceAction,
  friendlyAttendanceReason,
  submitAttendanceAttempt,
  uploadAttendanceEvidence,
  validateQrToken,
  type LogicalAttendanceAttempt
} from "@/lib/student/attendance/workflow";
import { studentQueryKeys } from "@/lib/student/query-keys";
import type { StudentAttendanceRecord } from "@/lib/student/types";
import { supabase } from "@/lib/supabase";
import { browserIsOnline } from "@/lib/student/offline/connectivity";
import { enqueueOfflineAttendance } from "@/lib/student/offline/queue";
import { localSessionOwnerId } from "@/lib/student/offline/session";
import { CameraCapture, type CapturedAttendancePhoto } from "./CameraCapture";
import { QrScanner } from "./QrScanner";

type Stage = "ready" | "location" | "qr" | "photo" | "review" | "submitting" | "queued" | "result" | "error";

interface AttemptState {
  ownerId: string;
  logical: LogicalAttendanceAttempt;
  location: BrowserLocation | null;
  qrToken: string | null;
  photo: CapturedAttendancePhoto | null;
  photoStoragePath: string | null;
  capturedOffline: boolean;
}

export function AttendanceWorkflow({
  event,
  attendance,
  deviceReady,
  onDeviceInvalid
}: {
  event: Event;
  attendance: StudentAttendanceRecord | null;
  deviceReady: boolean;
  onDeviceInvalid: () => void;
}) {
  const queryClient = useQueryClient();
  const action = deriveAttendanceAction(event, attendance);
  const [stage, setStage] = useState<Stage>("ready");
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);
  const photoRequired = attempt?.logical.mode === "time_out" ? event.time_out_photo_required : event.photo_required;
  const locationAccuracy = event.location?.required_gps_accuracy_meters ?? 50;

  const progress = useMemo(() => {
    const labels = ["Location", ...(event.dynamic_qr_required ? ["QR"] : []), ...(photoRequired ? ["Photo"] : []), "Submit"];
    const current = stage === "qr" ? "QR" : stage === "photo" ? "Photo" : stage === "review" || stage === "submitting" || stage === "result" ? "Submit" : "Location";
    return { labels, current };
  }, [event.dynamic_qr_required, photoRequired, stage]);

  function nextAfterLocation(nextAttempt: AttemptState) {
    setAttempt(nextAttempt);
    if (event.dynamic_qr_required && !nextAttempt.qrToken) setStage("qr");
    else if (photoRequired && !nextAttempt.photo) setStage("photo");
    else setStage("review");
  }

  async function captureLocation(baseAttempt: AttemptState) {
    setStage("location");
    setMessage("Getting your location…");
    try {
      const location = await getCurrentBrowserLocation();
      const nextAttempt = { ...baseAttempt, location };
      setAttempt(nextAttempt);
      if (!isLocationAccurate(location, locationAccuracy)) {
        setMessage(`GPS accuracy is ${Math.round(location.accuracy)} m. This event requires ${locationAccuracy} m or better.`);
        return;
      }
      setMessage("Location ready.");
      nextAfterLocation(nextAttempt);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to get your location.");
    }
  }

  async function startAttempt() {
    if (!action.mode || !deviceReady) return;
    setMessage("Verifying this browser…");
    setResult(null);
    setRetryable(false);
    try {
      const ownerId = await localSessionOwnerId();
      if (!ownerId) throw new AttendanceTransportError("Sign in again before starting attendance.", false);
      let capturedOffline = !browserIsOnline();
      if (!capturedOffline) {
        try {
          const device = await resolveCurrentBrowserDevice(supabase);
          if (!canBeginAttendance(device)) {
            onDeviceInvalid();
            setStage("error");
            setMessage("This browser is no longer the active attendance device. Register it again before continuing.");
            return;
          }
        } catch {
          // navigator.onLine is only a hint. A failed authoritative request can
          // still be captured locally; device authorization is repeated at sync.
          capturedOffline = true;
        }
      }
      const nextAttempt: AttemptState = {
        ownerId,
        logical: createLogicalAttempt(event.id, action.mode),
        location: null,
        qrToken: null,
        photo: null,
        photoStoragePath: null,
        capturedOffline
      };
      setAttempt(nextAttempt);
      await captureLocation(nextAttempt);
    } catch (caught) {
      setStage("error");
      setMessage(caught instanceof Error ? caught.message : "Unable to verify this browser.");
    }
  }

  async function saveForOfflineSync(currentAttempt: AttemptState, lastError?: string | null) {
    if (!currentAttempt.location) throw new Error("Capture your location before saving offline attendance.");
    const ownerId = await localSessionOwnerId();
    if (ownerId && ownerId !== currentAttempt.ownerId) throw new Error("Sign in again with the account that started this attendance attempt.");
    await enqueueOfflineAttendance({
      ownerId: currentAttempt.ownerId,
      event,
      logical: currentAttempt.logical,
      location: currentAttempt.location,
      qrToken: currentAttempt.qrToken,
      photo: currentAttempt.photo,
      photoStoragePath: currentAttempt.photoStoragePath,
      capturedOffline: currentAttempt.capturedOffline || !browserIsOnline(),
      lastError
    });
    setStage("queued");
    setRetryable(false);
    setMessage(lastError && /auth|session|sign in|login|account changed/i.test(lastError)
      ? "Attendance is saved on this device. Sign in again with the same account to resume it."
      : "Attendance saved on this device. Reconnect and sync within 2 hours for the server to review it.");
  }

  function scannedQr(token: string) {
    if (!attempt) return;
    const validation = validateQrToken(token, event.id);
    if (!validation.valid) {
      setMessage(validation.reason);
      return;
    }
    const nextAttempt = { ...attempt, qrToken: token.trim() };
    setAttempt(nextAttempt);
    setMessage("QR code ready.");
    if (photoRequired && !nextAttempt.photo) setStage("photo");
    else setStage("review");
  }

  function capturedPhoto(photo: CapturedAttendancePhoto) {
    if (!attempt) return;
    setAttempt({ ...attempt, photo });
    setMessage("Photo ready.");
    setStage("review");
  }

  async function submit() {
    if (!attempt || !attempt.location) return;
    if (!browserIsOnline()) {
      try {
        await saveForOfflineSync(attempt);
      } catch (caught) {
        setStage("error");
        setMessage(caught instanceof Error ? caught.message : "Unable to save attendance on this device.");
      }
      return;
    }
    setStage("submitting");
    setMessage(attempt.photo && !attempt.photoStoragePath ? "Uploading attendance evidence…" : "Submitting attendance…");
    setRetryable(false);
    let queueAttempt = attempt;
    try {
      const userId = await authenticatedUserId(supabase);
      if (userId !== attempt.ownerId) throw new AttendanceTransportError("The signed-in account changed. Sign in again with the account that started this attendance attempt.", false);
      const device = await resolveCurrentBrowserDevice(supabase);
      if (!canBeginAttendance(device) || !device.deviceId) {
        onDeviceInvalid();
        throw new AttendanceTransportError("This browser is no longer the active attendance device. Register it again before continuing.", false);
      }

      let workingAttempt = attempt;
      let workingLocation = attempt.location;
      if (isLocationStale(workingLocation)) {
        const refreshedLocation = await getCurrentBrowserLocation();
        workingLocation = refreshedLocation;
        workingAttempt = { ...workingAttempt, location: refreshedLocation };
        queueAttempt = workingAttempt;
        setAttempt(workingAttempt);
        if (!isLocationAccurate(refreshedLocation, locationAccuracy)) {
          setStage("location");
          setMessage(`GPS accuracy is ${Math.round(refreshedLocation.accuracy)} m. Refresh your location and try again.`);
          return;
        }
      }

      if (event.dynamic_qr_required) {
        const qrValidation = validateQrToken(workingAttempt.qrToken ?? "", event.id);
        if (!qrValidation.valid) {
          setAttempt({ ...workingAttempt, qrToken: null });
          setStage("qr");
          setMessage(qrValidation.reason);
          return;
        }
      }

      let photoStoragePath = workingAttempt.photoStoragePath;
      if (workingAttempt.photo && !photoStoragePath) {
        photoStoragePath = attendanceEvidencePath(userId, event.id, workingAttempt.logical.localId);
        await uploadAttendanceEvidence(supabase, photoStoragePath, workingAttempt.photo.blob);
        workingAttempt = { ...workingAttempt, photoStoragePath };
        queueAttempt = workingAttempt;
        setAttempt(workingAttempt);
      }

      const submissionOwnerId = await authenticatedUserId(supabase);
      if (submissionOwnerId !== workingAttempt.ownerId) throw new AttendanceTransportError("The signed-in account changed. Sign in again with the account that started this attendance attempt.", false);

      const submissionResult = await submitAttendanceAttempt(supabase, {
        local_id: workingAttempt.logical.localId,
        event_id: event.id,
        mode: workingAttempt.logical.mode,
        device_timestamp: workingLocation.capturedAt,
        latitude: workingLocation.latitude,
        longitude: workingLocation.longitude,
        accuracy_meters: workingLocation.accuracy,
        ...(photoStoragePath ? { photo_storage_path: photoStoragePath } : {}),
        ...(workingAttempt.photo?.hash ? { photo_hash: workingAttempt.photo.hash } : {}),
        ...(workingAttempt.qrToken ? { qr_token: workingAttempt.qrToken } : {}),
        device_id: device.deviceId,
        idempotency_key: workingAttempt.logical.idempotencyKey,
        is_offline_submission: false
      });

      setResult(submissionResult);
      setMessage(submissionResult.accepted ? submissionResult.verification_reason : friendlyAttendanceReason(submissionResult));
      setStage("result");
      if (/device is not active/i.test(submissionResult.verification_reason)) onDeviceInvalid();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.attendance }),
        queryClient.invalidateQueries({ queryKey: studentQueryKeys.event(event.id) })
      ]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Attendance submission failed.";
      const requiresReauthentication = caught instanceof AttendanceTransportError
        && !caught.retryable
        && /auth|session|sign in|login|account changed/i.test(message);
      const queueable = !browserIsOnline()
        || caught instanceof AttendanceTransportError && caught.retryable
        || requiresReauthentication
        || caught instanceof TypeError
        || /fetch|network|offline|load failed|temporar/i.test(message);
      if (queueable) {
        try {
          await saveForOfflineSync(queueAttempt, message);
          return;
        } catch (queueError) {
          setMessage(queueError instanceof Error ? queueError.message : "Unable to save attendance on this device.");
        }
      }
      setStage("error");
      setRetryable(caught instanceof AttendanceTransportError && caught.retryable);
      setMessage(message);
    }
  }

  function reset() {
    setAttempt(null);
    setResult(null);
    setMessage(null);
    setRetryable(false);
    setStage("ready");
  }

  const actionable = action.state === "check_in" || action.state === "check_out";

  return (
    <section aria-labelledby="attendance-actions-title" className="overflow-hidden rounded-3xl border border-student-200 bg-student-50 p-5 text-slate-800 shadow-sm sm:p-6">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-student-100"><ShieldCheck size={22} /></span><div><h2 id="attendance-actions-title" className="font-extrabold">{action.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{action.description}</p></div></div>

      {stage !== "ready" && attempt ? <div className="mt-5 grid grid-cols-4 gap-2" aria-label="Attendance progress">{progress.labels.map((label) => <div key={label} className={`rounded-full px-2 py-1.5 text-center text-[10px] font-bold ${label === progress.current ? "bg-white text-student-950" : "bg-student-100 text-slate-600"}`}>{label}</div>)}</div> : null}

      <div className="mt-5 rounded-3xl bg-white p-4 text-slate-950 sm:p-5">
        {stage === "ready" ? <div className="space-y-4"><div className="grid grid-cols-3 gap-2">{[{ icon: MapPin, label: "Location" }, { icon: QrCode, label: event.dynamic_qr_required ? "QR required" : "No QR" }, { icon: Camera, label: action.mode === "time_out" ? event.time_out_photo_required ? "Photo required" : "No photo" : event.photo_required ? "Photo required" : "No photo" }].map(({ icon: Icon, label }) => <div key={label} className="flex min-h-20 flex-col items-center justify-center rounded-2xl bg-slate-50 px-2 text-center text-slate-700"><Icon size={19} className="text-student-700" /><span className="mt-2 text-xs font-semibold">{label}</span></div>)}</div>{!deviceReady ? <p role="status" className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">Register and verify this browser before attendance.</p> : null}<Button type="button" className="w-full" disabled={!actionable || !deviceReady} onClick={() => void startAttempt()}>{action.mode === "time_out" ? "Start secure check-out" : "Start secure check-in"}</Button></div> : null}

        {stage === "location" && attempt ? <div className="space-y-4"><h3 className="font-extrabold">Confirm your current location</h3><p role="status" aria-live="polite" className="text-sm leading-6 text-slate-600">{message ?? "Getting your location…"}</p>{attempt.location ? <p className={`rounded-2xl p-3 text-sm ${isLocationAccurate(attempt.location, locationAccuracy) ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>Accuracy: {Math.round(attempt.location.accuracy)} meters</p> : <LoaderCircle className="animate-spin text-student-700" size={24} />}<div className="flex flex-wrap gap-3"><Button type="button" onClick={() => void captureLocation(attempt)}><RefreshCw size={17} /> Refresh location</Button><Button type="button" variant="outline" onClick={reset}>Cancel</Button></div></div> : null}

        {stage === "qr" ? <div className="space-y-4"><h3 className="font-extrabold">Scan the event QR code</h3>{message ? <p role="status" className="text-sm text-slate-600">{message}</p> : null}<QrScanner onScan={scannedQr} onCancel={reset} /></div> : null}

        {stage === "photo" ? <div className="space-y-4"><h3 className="font-extrabold">Capture attendance photo</h3><CameraCapture onConfirm={capturedPhoto} onCancel={reset} /></div> : null}

        {stage === "review" && attempt?.location ? <div className="space-y-4"><h3 className="font-extrabold">Review and submit</h3><div className="space-y-2 text-sm text-slate-600"><ReviewRow label="Action" value={attempt.logical.mode === "time_in" ? "Check in" : "Check out"} /><ReviewRow label="Location" value={`Ready · ${Math.round(attempt.location.accuracy)} m accuracy`} /><ReviewRow label="QR code" value={event.dynamic_qr_required ? attempt.qrToken ? "Scanned" : "Required" : "Not required"} /><ReviewRow label="Photo" value={photoRequired ? attempt.photo ? "Captured" : "Required" : "Not required"} /></div><p className="rounded-2xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">Final device, schedule, geofence, QR, evidence, and attendance checks are performed securely by the server.</p><div className="flex flex-wrap gap-3"><Button type="button" onClick={() => void submit()}>Submit {attempt.logical.mode === "time_in" ? "check-in" : "check-out"}</Button><Button type="button" variant="outline" onClick={reset}>Cancel</Button></div></div> : null}

        {stage === "submitting" ? <div className="flex min-h-44 flex-col items-center justify-center text-center"><LoaderCircle className="animate-spin text-student-700" size={34} /><h3 className="mt-4 font-extrabold">Submitting securely</h3><p role="status" className="mt-2 text-sm text-slate-600">{message}</p></div> : null}

        {stage === "queued" ? <div className="space-y-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800"><RefreshCw size={24} /></span><div><h3 className="font-extrabold">Attendance saved on this device</h3><p role="status" className="mt-2 text-sm leading-6 text-slate-600">{message}</p><p className="mt-2 text-xs leading-5 text-amber-800">This is not final attendance yet. Device registration, event eligibility, GPS, QR expiry, evidence, and timestamp freshness will be checked by the server during sync.</p></div><Button type="button" variant="outline" onClick={reset}>Done</Button></div> : null}

        {stage === "result" && result ? <ResultPanel result={result} message={message} onReset={reset} /> : null}

        {stage === "error" ? <div className="space-y-4"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700"><AlertCircle size={24} /></span><div><h3 className="font-extrabold">Unable to complete attendance</h3><p role="alert" className="mt-2 text-sm leading-6 text-slate-600">{message}</p></div><div className="flex flex-wrap gap-3">{retryable && attempt ? <Button type="button" onClick={() => void submit()}><RefreshCw size={17} /> Retry same submission</Button> : null}<Button type="button" variant="outline" onClick={reset}>{retryable ? "Cancel" : "Start over"}</Button></div></div> : null}
      </div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"><span>{label}</span><strong className="text-right text-slate-900">{value}</strong></div>;
}

function ResultPanel({ result, message, onReset }: { result: VerificationResult; message: string | null; onReset: () => void }) {
  return <div className="space-y-4"><span className={`flex h-12 w-12 items-center justify-center rounded-full ${result.accepted ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{result.accepted ? <CheckCircle2 size={25} /> : <AlertCircle size={25} />}</span><div><h3 className="font-extrabold">{result.accepted ? "Attendance accepted" : "Attendance rejected"}</h3><p role="status" className="mt-2 text-sm leading-6 text-slate-600">{message}</p></div>{result.distance_meters != null ? <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">Server-verified distance: {Math.round(result.distance_meters)} meters</p> : null}<Button type="button" variant="outline" onClick={onReset}>{result.accepted ? "Done" : "Start a new attempt"}</Button></div>;
}
