"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeCanvas } from "qrcode.react";
import { Clock, ExternalLink, Maximize2, Minimize2, QrCode, RefreshCw, Sparkles, X } from "lucide-react";
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
        .in("status", ["published", "ongoing", "draft"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: row.id as string,
        title: row.title as string,
        status: row.status as string,
        location_name: (Array.isArray(row.location) ? row.location[0]?.venue_name : row.location?.venue_name) as string | undefined
      }));
    }
  });

  const events = eventsQuery.data ?? [];

  // Default selection to the first ongoing or published event
  useEffect(() => {
    if (!selectedEventId && events.length > 0) {
      const ongoing = events.find((e) => e.status === "ongoing");
      setSelectedEventId(ongoing ? ongoing.id : (events[0]?.id ?? ""));
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  async function generateQR() {
    if (!selectedEventId) return;
    setGenerating(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-qr", {
        body: { eventId: selectedEventId, ttlSeconds: 30 }
      });
      if (error) {
        setErrorMessage(error.message);
        return;
      }
      setToken(data.token);
      setExpiresAt(data.expiresAt);
      setSecondsLeft(30);
    } catch (err: any) {
      setErrorMessage(err.message ?? "Failed to generate dynamic QR token");
    } finally {
      setGenerating(false);
    }
  }

  // Auto-countdown timer
  useEffect(() => {
    if (!token || !expiresAt) return;
    const interval = setInterval(() => {
      const diffMs = new Date(expiresAt).getTime() - Date.now();
      const remaining = Math.max(0, Math.ceil(diffMs / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0 && autoRotate) {
        void generateQR();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token, expiresAt, autoRotate, selectedEventId]);

  return (
    <>
      <Card className="rounded-3xl border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 p-5 bg-gradient-to-r from-blue-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <QrCode size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-950">Dynamic Anti-Spoofing QR Code</h2>
              <p className="text-xs text-slate-500">
                Rotates dynamically every 30 seconds to prevent student photo sharing and proxy check-ins.
              </p>
            </div>
          </div>

          {token ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProjectorOpen(true)}
              className="h-9 rounded-xl border-blue-200 bg-blue-50/80 text-xs font-bold text-blue-700 hover:bg-blue-100"
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
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Select Event for QR Attendance
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.status.toUpperCase()}) {evt.location_name ? `— ${evt.location_name}` : ""}
                    </option>
                  ))}
                  {events.length === 0 ? <option value="">No published events found</option> : null}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={generateQR}
                  disabled={!selectedEventId || generating}
                  className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700"
                >
                  <RefreshCw size={15} className={generating ? "animate-spin" : ""} />
                  <span>{token ? "Refresh QR Now" : "Launch Dynamic QR"}</span>
                </Button>

                {token ? (
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoRotate}
                      onChange={(e) => setAutoRotate(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-900">How students verify with QR:</p>
                <p>1. Students open the CSU Campus Attendance mobile app.</p>
                <p>2. Tap "Time In" and point their camera at this rotating code.</p>
                <p>3. The mobile app automatically verifies GPS geofence + cryptographic QR token in one step.</p>
              </div>
            </div>

            {/* QR Code Canvas Card */}
            {token ? (
              <div className="flex flex-col items-center rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md text-center">
                <div className="relative p-3 rounded-2xl bg-white ring-1 ring-slate-200 shadow-inner">
                  <QRCodeCanvas
                    value={token}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>

                {/* Progress bar countdown */}
                <div className="mt-4 w-full max-w-[200px]">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock size={12} />
                      Rotating in
                    </span>
                    <span className={secondsLeft <= 5 ? "text-rose-600 font-black animate-pulse" : "text-blue-700"}>
                      {secondsLeft}s
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        secondsLeft <= 5 ? "bg-rose-500" : "bg-gradient-to-r from-blue-600 to-indigo-600"
                      }`}
                      style={{ width: `${(secondsLeft / 30) * 100}%` }}
                    />
                  </div>
                </div>

                <p className="mt-3 text-xs font-bold text-slate-900 line-clamp-1 max-w-[220px]">
                  {selectedEvent?.title ?? "Campus Event"}
                </p>
                <p className="text-[11px] text-slate-500">Scan via CSU Mobile App</p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Projector Fullscreen Modal */}
      {isProjectorOpen && token ? (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 p-6 text-white backdrop-blur-md">
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
            <p className="mt-2 text-base text-slate-400">
              Point your CSU Attendance mobile camera to verify attendance
            </p>

            <div className="my-8 p-6 rounded-3xl bg-white shadow-2xl shadow-blue-500/20 ring-4 ring-white/20">
              <QRCodeCanvas
                value={token}
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
        </div>
      ) : null}
    </>
  );
}
