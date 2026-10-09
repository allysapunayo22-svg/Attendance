"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { Event } from "@attendance/types";
import type { StudentAttendanceRecord } from "@/lib/student/types";
import { BrowserDeviceEnrollment } from "./BrowserDeviceEnrollment";
import { AttendanceWorkflow } from "./attendance/AttendanceWorkflow";
import { useBrowserOnline } from "@/lib/student/offline/connectivity";
import { getStoredBrowserIdentity } from "@/lib/student/browser-device";

export function AttendanceActionBoundary({ event, attendance, offlineFallback = false }: { event: Event; attendance: StudentAttendanceRecord | null; offlineFallback?: boolean }) {
  const online = useBrowserOnline();
  const [deviceReady, setDeviceReady] = useState(false);
  const [deviceRevision, setDeviceRevision] = useState(0);
  const handleReadyChange = useCallback((ready: boolean) => setDeviceReady(ready), []);
  const handleDeviceInvalid = useCallback(() => {
    setDeviceReady(false);
    setDeviceRevision((revision) => revision + 1);
  }, []);
  const offlineReady = !online && offlineFallback && Boolean(getStoredBrowserIdentity());

  return (
    <div className="space-y-4">
      <BrowserDeviceEnrollment key={deviceRevision} onReadyChange={handleReadyChange} offlineCaptureAllowed />
      <AttendanceWorkflow event={event} attendance={attendance} deviceReady={deviceReady || offlineReady} onDeviceInvalid={handleDeviceInvalid} />
      <div className="text-center"><Link href="/student/attendance" className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-bold text-teal-900 shadow-sm ring-1 ring-slate-200 hover:bg-teal-50">View attendance history</Link></div>
    </div>
  );
}
