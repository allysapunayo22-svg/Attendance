"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, ChevronRight, MapPin, RefreshCw, ShieldAlert, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, labelize } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

async function fetchReviewQueue() {
  const { data, error } = await supabase.from("attendance_sessions").select("*, student:student_profiles(full_name,student_id), event:events(title), reviews:attendance_reviews(*)").or("status.eq.pending_verification,sync_status.eq.requires_review").order("updated_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

type QueueRow = Awaited<ReturnType<typeof fetchReviewQueue>>[number];
type Decision = "approve" | "reject" | "late" | "excuse";

function EvidenceImage({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { setUrl(null); if (path) void supabase.storage.from("attendance-evidence").createSignedUrl(path, 300).then(({ data }) => setUrl(data?.signedUrl ?? null)); }, [path]);
  if (!path) return <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">No photo evidence</div>;
  if (!url) return <div className="aspect-[4/3] animate-pulse rounded-2xl bg-slate-100" aria-label="Loading evidence photo" />;
  return <Image src={url} alt="Student attendance evidence" width={720} height={540} className="aspect-[4/3] w-full rounded-2xl object-cover" />;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-bold text-slate-900">{value}</p></div>;
}

export function AttendanceReviewQueue() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["attendance-review"], queryFn: fetchReviewQueue });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rows = query.data ?? [];
  const filtered = useMemo(() => { const term = filter.trim().toLowerCase(); return term ? rows.filter((row) => `${row.student?.full_name} ${row.student?.student_id} ${row.event?.title} ${row.verification_reason}`.toLowerCase().includes(term)) : rows; }, [filter, rows]);
  const selected = rows.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  useEffect(() => { if (!selectedId && rows[0]) setSelectedId(rows[0].id); }, [rows, selectedId]);

  async function submitDecision() {
    if (!selected || !decision || (decision === "reject" && !notes.trim())) return;
    setSubmitting(true); setMessage(null);
    const { error } = await supabase.functions.invoke("review-attendance", { body: { attendanceId: selected.id, decision, notes: notes.trim(), rejectionReason: decision === "reject" ? notes.trim() : undefined } });
    setSubmitting(false);
    if (error) { setMessage(error.message); return; }
    const currentIndex = filtered.findIndex((row) => row.id === selected.id);
    const next = filtered[currentIndex + 1] ?? filtered[currentIndex - 1] ?? null;
    setSelectedId(next?.id ?? null); setDecision(null); setNotes(""); setMessage("Decision saved. The next record is ready.");
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["attendance-review"] }), queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] })]);
  }

  if (query.isLoading) return <div className="grid gap-4 lg:grid-cols-[360px_1fr]">{[1,2,3].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
  if (query.isError) return <Card><CardContent className="flex flex-col items-start gap-3"><p className="font-bold">Review queue could not be loaded.</p><Button variant="outline" onClick={() => void query.refetch()}><RefreshCw size={16} />Try again</Button></CardContent></Card>;
  if (!rows.length) return (
    <Card className="rounded-3xl border-slate-200/80 shadow-sm">
      <CardContent className="py-16 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
          <Check size={28} />
        </span>
        <h2 className="mt-4 text-xl font-black text-slate-900">Review queue is clear</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          All student check-ins passed automatic verification! Flagged, outside-zone, or suspicious records will appear here for manual review.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild className="rounded-xl bg-blue-600 px-5 font-bold hover:bg-blue-700 shadow-sm">
            <Link href="/attendance/live">View Live Radar Stream →</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl border-slate-200 font-bold">
            <Link href="/">Back to Dashboard</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      {message ? <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><span>{message}</span><button aria-label="Dismiss message" onClick={() => setMessage(null)}><X size={16} /></button></div> : null}
      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_minmax(0,1fr)_280px]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-200 p-4"><div className="flex items-center justify-between"><h2 className="font-black">Queue</h2><Badge tone="requires_review">{rows.length} open</Badge></div><Input className="mt-3" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Find student or event" aria-label="Filter review queue" /></div>
          <div className="max-h-[360px] overflow-y-auto lg:max-h-[590px]">
            {filtered.map((row) => <button key={row.id} onClick={() => setSelectedId(row.id)} className={cn("flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition", selected?.id === row.id ? "bg-blue-50/70 border-l-3 border-brand-700 shadow-xs" : "hover:bg-slate-50")}><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle size={17} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{row.student?.full_name ?? "Student"}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{row.event?.title ?? "Event"}</span><span className="mt-1 block truncate text-xs font-medium text-amber-700">{row.verification_reason || "Verification required"}</span></span><ChevronRight size={16} className="mt-2 text-slate-400" /></button>)}
            {!filtered.length ? <p className="p-6 text-center text-sm text-slate-500">No records match this filter.</p> : null}
          </div>
        </aside>

        {selected ? <main className="min-w-0 p-5 lg:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-brand-700">Evidence review</p><h2 className="mt-1 text-2xl font-black">{selected.student?.full_name ?? "Student"}</h2><p className="mt-1 text-sm text-slate-500">{selected.student?.student_id} · {selected.event?.title}</p></div><Badge tone={selected.status}>{labelize(selected.status)}</Badge></div><div className="mt-5 grid gap-5 xl:grid-cols-2"><EvidenceImage path={selected.time_in_photo_path} /><div className="space-y-3"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2"><ShieldAlert className="shrink-0 text-amber-700" size={19} /><div><p className="font-bold text-amber-950">Why this was flagged</p><p className="mt-1 text-sm leading-5 text-amber-800">{selected.verification_reason || "Automatic verification could not complete."}</p></div></div></div><div className="grid grid-cols-2 gap-3"><Detail label="Distance" value={selected.time_in_distance != null ? `${Math.round(selected.time_in_distance)} m` : "Not available"} /><Detail label="GPS accuracy" value={selected.time_in_accuracy != null ? `${Math.round(selected.time_in_accuracy)} m` : "Not available"} /><Detail label="QR evidence" value={selected.time_in_qr_token ? "Submitted" : "Not submitted"} /><Detail label="Offline" value={selected.is_offline_submission ? "Yes" : "No"} /></div></div></div><div className="mt-5 rounded-xl border border-slate-200 p-4"><p className="flex items-center gap-2 font-bold"><MapPin size={17} className="text-brand-700" />Verification signals</p><p className="mt-2 text-sm text-slate-600">Device: {selected.device_id ?? "Not available"}</p><p className="mt-1 text-sm text-slate-600">Flags: {selected.suspicious_flags?.map(labelize).join(", ") || "No additional flags"}</p></div></main> : null}

        <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0"><h2 className="font-black">Decision</h2><p className="mt-1 text-sm leading-5 text-slate-500">Review the evidence before resolving this record.</p><div className="mt-5 space-y-2"><Button className="w-full" onClick={() => setDecision("approve")}><Check size={16} />Approve</Button><Button variant="outline" className="w-full" onClick={() => setDecision("late")}>Mark late</Button><Button variant="outline" className="w-full" onClick={() => setDecision("excuse")}>Mark excused</Button><Button variant="destructive" className="w-full" onClick={() => setDecision("reject")}>Reject</Button></div><p className="mt-5 text-xs leading-5 text-slate-500">Decisions are recorded in the audit trail. Rejections require a reason.</p></aside>
      </div>

      <Dialog.Root open={Boolean(decision)} onOpenChange={(open) => { if (!open) { setDecision(null); setNotes(""); } }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><Dialog.Title className="text-xl font-black">Confirm {decision ? labelize(decision) : "decision"}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">This updates {selected?.student?.full_name ?? "the student"}’s attendance record and adds an audit entry.</Dialog.Description><label className="mt-5 block text-sm font-bold text-slate-700" htmlFor="decision-notes">{decision === "reject" ? "Reason (required)" : "Administrator notes (optional)"}</label><textarea id="decision-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-100" placeholder={decision === "reject" ? "Explain why this attendance cannot be accepted…" : "Add context for the audit trail…"} />{message && decision ? <p className="mt-2 text-sm text-red-700">{message}</p> : null}<div className="mt-5 flex justify-end gap-3"><Dialog.Close asChild><Button variant="outline">Cancel</Button></Dialog.Close><Button variant={decision === "reject" ? "destructive" : "default"} disabled={submitting || (decision === "reject" && !notes.trim())} onClick={() => void submitDecision()}>{submitting ? "Saving…" : "Confirm decision"}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    </div>
  );
}
