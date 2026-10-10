"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AttendanceActionBoundary } from "@/components/student/AttendanceActionBoundary";
import { StudentPwaCoordinator } from "./StudentPwaCoordinator";
import { getCachedAttendanceForOwner, getCachedEventForOwner } from "@/lib/student/offline/db";
import { localSessionOwnerId } from "@/lib/student/offline/session";
import type { Event } from "@attendance/types";
import type { StudentAttendanceRecord } from "@/lib/student/types";
import { supabase } from "@/lib/supabase";

export function OfflineStudentApp() {
  const [event, setEvent] = useState<Event | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let loadVersion = 0;
    const loadOwnerData = async (ownerId: string | null) => {
      const version = ++loadVersion;
      setEvent(null);
      setAttendance(null);
      setReady(false);
      const eventId = window.location.pathname.match(/^\/student\/events\/([^/]+)/)?.[1]
        ?? new URLSearchParams(window.location.search).get("event")
        ?? undefined;
      if (ownerId && eventId) {
        const [cachedEvent, cachedAttendance] = await Promise.all([
          getCachedEventForOwner(ownerId, eventId),
          getCachedAttendanceForOwner(ownerId)
        ]);
        if (version === loadVersion) {
          setEvent(cachedEvent);
          setAttendance(cachedAttendance.find((item) => item.event_id === eventId) ?? null);
        }
      }
      if (version === loadVersion) setReady(true);
    };
    void localSessionOwnerId().then(loadOwnerData);
    const { data } = supabase.auth.onAuthStateChange((_event, session) => void loadOwnerData(session?.user.id ?? null));
    return () => {
      loadVersion += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="student-app min-h-dvh bg-student-50 text-slate-950">
      <header className="student-safe-top border-b border-slate-200 bg-white px-4 pb-3"><div className="mx-auto flex max-w-3xl items-center gap-2"><Image src="/logo.png" alt="ClickIn" width={38} height={38} className="h-9 w-9 rounded-xl" /><strong className="text-student-950">ClickIn</strong></div></header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <StudentPwaCoordinator />
        {!ready ? <p className="rounded-3xl bg-white p-6 text-sm text-slate-600">Loading saved attendance data…</p> : event ? <div className="space-y-4"><section className="rounded-3xl border border-student-200 bg-student-50 p-5 text-slate-800"><p className="text-xs font-bold uppercase tracking-wide text-student-700">Saved event data</p><h1 className="mt-2 text-xl font-black">{event.title}</h1><p className="mt-2 text-sm leading-6 text-slate-600">This cached event is for offline capture only. The server will recheck assignment, schedule, device, GPS, QR, evidence, and freshness after reconnecting.</p></section><AttendanceActionBoundary event={event} attendance={attendance} offlineFallback /></div> : <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm"><h1 className="text-xl font-black">ClickIn offline</h1><p className="mt-2 text-sm leading-6 text-slate-600">The safe app shell is available, but this page has no previously saved event data. Reconnect to load your assigned events.</p></section>}
      </main>
    </div>
  );
}
