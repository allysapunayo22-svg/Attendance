"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Clock, Maximize2, QrCode, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export function DynamicQrPanel() {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(30);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch published/ongoing events for the dropdown
  const eventsQuery = useQuery({
    queryKey: ["qr-selectable-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, status, location:event_locations(venue_name)")
        .in("status", ["published", "ongoing"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status,
        location_name: Array.isArray(row.location) ? row.location[0]?.venue_name : undefined
      }));
    }
  });

  const events = eventsQuery.data ?? [];
  const defaultEventId = events.find((event) => event.status === "ongoing")?.id ?? events[0]?.id ?? "";
  const activeEventId = selectedEventId || defaultEventId;
  const selectedEvent = events.find((event) => event.id === activeEventId);

  function changeEvent(eventId: string) {
    setSelectedEventId(eventId);
    setToken(null);
    setExpiresAt(null);
    setSecondsLeft(30);
    setErrorMessage(null);
    setIsProjectorOpen(false);
  }

  const generateQR = useCallback(async () => {
    if (!activeEventId) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-qr", {
        body: { eventId: activeEventId, ttlSeconds: 30 }
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setSecondsLeft(30);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate dynamic QR token");
    } finally {
      setGenerating(false);
    }
  }, [activeEventId]);

  // Auto-countdown timer
  useEffect(() => {
    if (!token || !expiresAt) return;
    const interval = setInterval(() => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && autoRotate && !generating) {
        void generateQR();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, expiresAt, autoRotate, generating, generateQR]);

  return (
    <>
      <Card className="rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-5 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <QrCode size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Event attendance QR</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Show a rotating code for students to scan when they check in.
              </p>
            </div>
          </div>

          {token ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProjectorOpen(true)}
              className="h-9 rounded-xl border-slate-200 text-xs font-semibold text-brand-700 hover:bg-slate-50 shadow-xs"
            >
              <Maximize2 size={14} />
              <span>Projector Mode</span>
            </Button>
          ) : null}
        </CardHeader>

        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Event selection controls */}
            <div className="flex-1 space-y-4">
              <div>
                <label htmlFor="qr-event" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Event
                </label>
                <select
                  id="qr-event"
                  value={activeEventId}
                  onChange={(e) => changeEvent(e.target.value)}
                  disabled={eventsQuery.isLoading || eventsQuery.isError}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.status.toUpperCase()}) {evt.location_name ? `— ${evt.location_name}` : ""}
                    </option>
                  ))}
                  {events.length === 0 ? <option value="">No published events found</option> : null}
                </select>
              </div>

              {eventsQuery.isError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">Events could not be loaded. <button className="underline" onClick={() => void eventsQuery.refetch()}>Try again</button></div> : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={generateQR}
                  disabled={!activeEventId || generating}
                  className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 px-5 text-xs font-semibold text-white shadow-xs"
                >
                  <RefreshCw size={14} className={generating ? "animate-spin" : ""} />
                  <span>{token ? "Refresh QR" : "Show event QR"}</span>
                </Button>

                {token ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                    />
                    <span>Auto-refresh every 30s</span>
                  </label>
                ) : null}
              </div>

              {errorMessage ? (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Student instructions</p>
                <p>1. Open the CSU Attendance app and tap Time In.</p>
                <p>2. Scan the code shown here.</p>
                <p>3. Wait for the check-in confirmation.</p>
              </div>
            </div>

            {/* QR Code Canvas Card */}
            {token ? (
              <div className="flex flex-col items-center rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs text-center">
                <div className="relative p-2.5 rounded-xl bg-white ring-1 ring-slate-200">
                  <QRCodeCanvas
                    value={token}
                    size={190}
                    level="H"
                    includeMargin
                  />
                </div>

                {/* Progress bar countdown */}
                <div className="mt-4 w-full max-w-[190px]">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock size={12} />
                      Rotating in
                    </span>
                    <span className={secondsLeft <= 5 ? "text-rose-600 font-bold animate-pulse" : "text-brand-700 font-bold"}>
                      {secondsLeft}s
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        secondsLeft <= 5 ? "bg-rose-500" : "bg-brand-700"
                      }`}
                      style={{ width: `${(secondsLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs font-bold text-slate-900 line-clamp-1 max-w-[200px]">
                  {selectedEvent?.title ?? "Campus Event"}
                </p>
                <p className="text-[11px] text-slate-500">Scan via CSU Mobile App</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Projector Fullscreen Modal */}
      <Dialog.Root open={isProjectorOpen && Boolean(token)} onOpenChange={setIsProjectorOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md" />
          <Dialog.Content className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto p-6 text-white" aria-describedby="projector-description">
          <Dialog.Title className="sr-only">Event QR projector mode</Dialog.Title>
          <button
            type="button"
            onClick={() => setIsProjectorOpen(false)}
            aria-label="Close Projector Mode"
            className="absolute top-6 right-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X size={24} />
          </button>

          <div className="flex flex-col items-center text-center max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-bold text-blue-300 border border-blue-400/30">
              <Sparkles size={15} /> Official Event Check-in Station
            </span>
            <h1 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-white">
              {selectedEvent?.title ?? "Campus Event"}
            </h1>
            <Dialog.Description id="projector-description" className="mt-2 text-base text-slate-400">
              Point your CSU Attendance mobile camera to verify attendance
            </Dialog.Description>

            <div className="my-8 p-6 rounded-3xl bg-white shadow-2xl shadow-blue-500/20 ring-4 ring-white/20">
              <QRCodeCanvas
                value={token ?? ""}
                size={320}
                level="H"
                includeMargin
              />
            </div>

            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-sm font-bold text-slate-300">
                <span>Code refreshes in:</span>
                <span className={secondsLeft <= 5 ? "text-rose-400 font-black animate-pulse" : "text-blue-400"}>
                  {secondsLeft} seconds
                </span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all duration-1000 ${
                    secondsLeft <= 5 ? "bg-rose-500" : "bg-gradient-to-r from-blue-500 to-indigo-400"
                  }`}
                  style={{ width: `${(secondsLeft / 30) * 100}%` }}
                />
              </div>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              Caraga State University • Location Verified Check-in
            </p>
          </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
