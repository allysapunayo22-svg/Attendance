"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";

export function ConfirmDialog({ open, title, description, confirmLabel, destructive = false, busy = false, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; destructive?: boolean; busy?: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <Dialog.Root open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/50" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${destructive ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}><AlertTriangle size={21} /></span><Dialog.Title className="mt-4 text-xl font-black text-slate-950">{title}</Dialog.Title><Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">{description}</Dialog.Description><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onCancel}>Cancel</Button><Button variant={destructive ? "destructive" : "default"} disabled={busy} onClick={onConfirm}>{busy ? "Working…" : confirmLabel}</Button></div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
