"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const groups = [
  {
    label: "Workspace",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/events", label: "Events", icon: CalendarDays }
    ]
  },
  {
    label: "Attendance",
    items: [
      { href: "/attendance/live", label: "Live Radar", icon: ClipboardCheck },
      { href: "/attendance/review", label: "Review Queue", icon: Bell, badgeKey: "review" }
    ]
  },
  {
    label: "Management",
    items: [
      { href: "/students", label: "Students", icon: Users },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
      { href: "/reports", label: "Reports", icon: BarChart3 }
    ]
  }
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onToggle, onMobileClose }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          "hidden h-screen shrink-0 overflow-hidden border-r border-slate-800/80 bg-[#0c1527] shadow-lg transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      <Dialog.Root open={mobileOpen} onOpenChange={(open) => { if (!open) onMobileClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 overflow-hidden border-r border-slate-800 bg-[#0c1527] shadow-2xl md:hidden">
            <Dialog.Title className="sr-only">Admin navigation</Dialog.Title>
            <Dialog.Description className="sr-only">Navigate between administration screens.</Dialog.Description>
            <SidebarContent collapsed={false} onToggle={onMobileClose} mobile />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function SidebarContent({ collapsed, onToggle, mobile }: { collapsed: boolean; onToggle: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState("admin@csu.edu.ph");
  const ToggleIcon = mobile ? X : collapsed ? PanelLeftOpen : PanelLeftClose;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setAdminEmail(data.user.email);
      }
    });
  }, []);

  const pendingReviewQuery = useQuery({
    queryKey: ["sidebar-pending-reviews"],
    queryFn: async () => {
      const { count } = await supabase
        .from("attendance_sessions")
        .select("*", { count: "exact", head: true })
        .or("status.eq.pending_verification,sync_status.eq.requires_review");
      return count ?? 0;
    },
    refetchInterval: 25_000
  });

  const pendingCount = pendingReviewQuery.data ?? 0;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="flex h-full flex-col bg-[#0c1527]">
      {/* Header with App Logo */}
      <div className={cn("flex min-h-20 items-center border-b border-slate-800/80", collapsed ? "justify-center px-3" : "justify-between gap-3 p-5")}>
        <Link href="/" className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-900/60 p-1.5 shadow-md shadow-slate-950/40 ring-1 ring-brand-500/30">
            <Image
              src="/logo.png"
              alt="Logo"
              width={34}
              height={34}
              className="h-full w-full object-contain"
            />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-brand-500 ring-2 ring-[#0c1527]">
              <span className="h-1 w-1 rounded-full bg-white" />
            </span>
          </div>

          {!collapsed ? (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-base font-black tracking-tight text-white">Campus Attendance</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-300">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                <span className="truncate">Admin Console</span>
              </div>
            </div>
          ) : null}
        </Link>

        <button
          type="button"
          aria-label={mobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={mobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-800/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          <ToggleIcon size={18} />
        </button>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Admin navigation" className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto p-3", collapsed && "space-y-2 px-2")}>
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed ? (
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>
            ) : null}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const hasBadge = item.badgeKey === "review" && pendingCount > 0;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { if (mobile) onToggle(); }}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex min-h-11 items-center rounded-xl text-sm font-semibold transition focus:outline-none",
                      collapsed ? "justify-center px-0" : "gap-3 px-3 py-2.5",
                      active
                        ? "bg-brand-700/25 text-white font-bold border border-brand-500/40 shadow-sm"
                        : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn("shrink-0 transition", active ? "text-brand-400" : "text-slate-400 group-hover:text-slate-200")}
                      size={collapsed ? 20 : 18}
                    />
                    {collapsed ? (
                      <span className="sr-only">{item.label}</span>
                    ) : (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}

                    {/* Pending Review count badge */}
                    {hasBadge ? (
                      collapsed ? (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950 ring-2 ring-[#0c1527]">
                          {pendingCount > 9 ? "9+" : pendingCount}
                        </span>
                      ) : (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-black text-slate-950 shadow-sm">
                          {pendingCount}
                        </span>
                      )
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Profile Footer */}
      <div className="border-t border-slate-800/80 p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="flex h-11 w-full items-center justify-center rounded-xl text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
          >
            <LogOut size={18} />
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-slate-900/90 border border-slate-800/80 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-800 to-brand-600 text-xs font-bold text-white shadow-sm ring-1 ring-brand-400/30">
                AD
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-200">{adminEmail}</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                  <p className="text-[10px] font-semibold text-brand-300">System Admin</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log out"
              aria-label="Log out"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition"
            >
              <LogOut size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
