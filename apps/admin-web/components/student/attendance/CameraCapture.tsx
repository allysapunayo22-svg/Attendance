"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, ImagePlus, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  hashEvidenceBlob,
  imageFileToEvidence,
  requestVideoStream,
  stopMediaStream,
  videoFrameToEvidence
} from "@/lib/student/attendance/media";

export interface CapturedAttendancePhoto {
  blob: Blob;
  hash: string;
}

export function CameraCapture({ onConfirm, onCancel }: { onConfirm: (photo: CapturedAttendancePhoto) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CapturedAttendancePhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  function stopCamera(updateState = true) {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (updateState) setCameraOpen(false);
  }

  function clearPhoto() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPhoto(null);
  }

  async function openCamera() {
    stopCamera();
    clearPhoto();
    setStarting(true);
    setError(null);
    try {
      const stream = await requestVideoStream("user");
      streamRef.current = stream;
      if (!videoRef.current) {
        stopMediaStream(stream);
        throw new Error("The camera preview is unavailable.");
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOpen(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open the camera.");
    } finally {
      setStarting(false);
    }
  }

  async function preparePhoto(blob: Blob) {
    const hash = await hashEvidenceBlob(blob);
    stopCamera();
    clearPhoto();
    setPhoto({ blob, hash });
    setPreview(URL.createObjectURL(blob));
  }

  async function capture() {
    if (!videoRef.current) return;
    setCapturing(true);
    setError(null);
    try {
      await preparePhoto(await videoFrameToEvidence(videoRef.current));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to capture the photo.");
    } finally {
      setCapturing(false);
    }
  }

  async function selectFallback(file: File | undefined) {
    if (!file) return;
    setCapturing(true);
    setError(null);
    try {
      await preparePhoto(await imageFileToEvidence(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to prepare the photo.");
    } finally {
      setCapturing(false);
    }
  }

  useEffect(() => () => {
    stopCamera(false);
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">Take a current selfie for this attendance action. The photo is used as attendance evidence only.</p>
      <div className="overflow-hidden rounded-3xl bg-slate-950">
        {preview ? <Image src={preview} alt="Captured attendance selfie preview" width={1280} height={1280} unoptimized className="aspect-[3/4] max-h-[65dvh] w-full object-cover sm:aspect-video" /> : <video ref={videoRef} autoPlay playsInline muted aria-label="Live front-camera preview" className="aspect-[3/4] max-h-[65dvh] w-full object-cover sm:aspect-video" />}
        {starting || capturing ? <div className="-mt-16 flex h-16 items-center justify-center bg-slate-950/70 text-white"><LoaderCircle className="animate-spin" size={26} /></div> : null}
      </div>
      {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        {!cameraOpen && !photo ? <Button type="button" onClick={() => void openCamera()} disabled={starting}><Camera size={17} /> Open front camera</Button> : null}
        {cameraOpen && !photo ? <Button type="button" onClick={() => void capture()} disabled={capturing || starting}><Camera size={17} /> Capture photo</Button> : null}
        {photo ? <><Button type="button" onClick={() => onConfirm(photo)}><Check size={17} /> Use this photo</Button><Button type="button" variant="secondary" onClick={() => void openCamera()}><RefreshCw size={17} /> Retake</Button></> : null}
        <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-within:ring-2 focus-within:ring-brand-200">
          <ImagePlus size={17} /> Device camera fallback
          <input type="file" accept="image/*" capture="user" className="sr-only" onChange={(event) => void selectFallback(event.target.files?.[0])} />
        </label>
        <Button type="button" variant="outline" onClick={() => { stopCamera(); onCancel(); }}><X size={17} /> Cancel</Button>
      </div>
    </div>
  );
}
