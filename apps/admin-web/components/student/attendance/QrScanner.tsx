"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { Camera, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopMediaStream } from "@/lib/student/attendance/media";

export function QrScanner({ onScan, onCancel }: { onScan: (token: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) stopMediaStream(stream);
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150, delayBetweenScanSuccess: 500 });
    setStarting(true);
    setError(null);

    void reader.decodeFromConstraints(
      { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current,
      (result, _scanError, controls) => {
        if (cancelled) return;
        controlsRef.current = controls;
        setStarting(false);
        if (result?.getText()) {
          stopScanner();
          setOpen(false);
          onScan(result.getText());
          return;
        }
        // Decoder misses are expected while the camera is moving or no QR is
        // visible. Camera/permission failures reject decodeFromConstraints.
      }
    ).then((controls) => {
      if (cancelled) controls.stop();
      else controlsRef.current = controls;
      setStarting(false);
    }).catch((caught) => {
      if (!cancelled) {
        const name = (caught as { name?: string })?.name;
        setError(name === "NotAllowedError" ? "Camera permission is required to scan the event QR code." : "The QR camera is unavailable. Check browser permissions and try again.");
        setStarting(false);
      }
    });

    return () => {
      cancelled = true;
      stopScanner();
      BrowserQRCodeReader.releaseAllStreams();
    };
  }, [open, onScan]);

  if (!open) {
    return <div className="space-y-3"><p className="text-sm leading-6 text-slate-600">Use the rear camera to scan the current QR code displayed by the event marshal.</p>{error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}<div className="flex flex-wrap gap-3"><Button type="button" onClick={() => setOpen(true)}><Camera size={17} /> Open QR scanner</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div></div>;
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-3xl bg-slate-950">
        <video ref={videoRef} autoPlay playsInline muted aria-label="Live camera preview for QR scanning" className="aspect-[3/4] max-h-[65dvh] w-full object-cover sm:aspect-video" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-3xl border-4 border-white/80 shadow-[0_0_0_999px_rgba(2,6,23,0.35)]" />
        {starting ? <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white"><LoaderCircle className="animate-spin" size={28} /></div> : null}
      </div>
      <p role="status" aria-live="polite" className="text-sm text-slate-600">{error ?? (starting ? "Starting QR camera…" : "Point the camera at the event QR code.")}</p>
      <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" onClick={() => { stopScanner(); setOpen(false); }}><X size={17} /> Close scanner</Button>{error ? <Button type="button" variant="secondary" onClick={() => { stopScanner(); setOpen(false); setTimeout(() => setOpen(true), 0); }}><RotateCcw size={17} /> Retry</Button> : null}</div>
    </div>
  );
}
