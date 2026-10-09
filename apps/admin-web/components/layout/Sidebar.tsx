"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Bell, CalendarDays, ClipboardCheck, LayoutDashboard, Megaphone, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const groups = [
  { label: "Main", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }, { href: "/admin/events", label: "Events", icon: CalendarDays }] },
  { label: "Attendance", items: [{ href: "/admin/live-attendance", label: "Live Attendance", icon: ClipboardCheck }, { href: "/admin/review-queue", label: "Review Queue", icon: Bell, badgeKey: "review" }] },
  { label: "Management", items: [{ href: "/admin/students", label: "Students", icon: Users }, { href: "/admin/announcements", label: "Announcements", icon: Megaphone }, { href: "/admin/reports", label: "Reports", icon: BarChart3 }] }
];

export function Sidebar({ mobileOpen, onMobileClose }: { mobileOpen: boolean; onMobileClose: () => void }) {
  return (
    <>
      <aside className="hidden h-screen w-[268px] shrink-0 overflow-hidden border-r border-slate-800/70 bg-[#132036] shadow-lg md:flex md:flex-col"><SidebarContent /></aside>
      <Dialog.Root open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[268px] overflow-hidden border-r border-slate-800 bg-[#132036] shadow-2xl md:hidden">
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Navigate between administration screens.</Dialog.Description>
            <SidebarContent mobile onMobileClose={onMobileClose} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function SidebarContent({ mobile = false, onMobileClose }: { mobile?: boolean; onMobileClose?: () => void }) {
  const pathname = usePathname();
  const pendingReviewQuery = useQuery({
    queryKey: ["sidebar-pending-reviews"],
    queryFn: async () => {
      const { count } = await supabase.from("attendance_sessions").select("*", { count: "exact", head: true }).or("status.eq.pending_verification,sync_status.eq.requires_review");
      return count ?? 0;
    },
    refetchInterval: 25_000
  });
  const pendingCount = pendingReviewQuery.data ?? 0;

  return (
    <div className="flex h-full flex-col bg-[#132036]">
      <div className="flex min-h-24 items-center justify-between gap-3 px-5 py-6">
        <Link href="/admin" onClick={() => { if (mobile) onMobileClose?.(); }} className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/60 p-1.5 shadow-md shadow-slate-950/40 ring-1 ring-brand-500/30"><Image src="/logo.png" alt="ClickIn" width={34} height={34} className="h-full w-full object-contain" /></span>
          <span className="min-w-0"><span className="block truncate text-base font-black tracking-tight text-white">ClickIn</span><span className="block text-xs font-medium text-slate-400">Admin Console</span></span>
        </Link>
        {mobile ? <button type="button" onClick={onMobileClose} aria-label="Close sidebar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button> : null}
      </div>

      <nav aria-label="Admin navigation" className="min-h-0 flex-1 space-y-7 overflow-y-auto px-3 py-2">
        {groups.map((group) => <div key={group.label}><p className="mb-2.5 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{group.label}</p><div className="space-y-1">{group.items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          const hasBadge = item.badgeKey === "review" && pendingCount > 0;
          return <Link key={item.href} href={item.href} onClick={() => { if (mobile) onMobileClose?.(); }} className={cn("group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition", active ? "border border-brand-400/20 bg-gradient-to-r from-brand-500/30 to-brand-400/20 font-bold text-white shadow-sm" : "text-slate-300 hover:bg-white/[0.07] hover:text-white")}><Icon size={18} className={cn("shrink-0", active ? "text-brand-300" : "text-slate-400 group-hover:text-slate-200")} /><span className="flex-1 truncate">{item.label}</span>{hasBadge ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-slate-950">{pendingCount > 99 ? "99+" : pendingCount}</span> : null}</Link>;
        })}</div></div>)}
      </nav>
    </div>
  );
}
