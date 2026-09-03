"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups = [
  { label: "Workspace", items: [{ href: "/", label: "Overview", icon: LayoutDashboard }, { href: "/events", label: "Events", icon: CalendarDays }] },
  { label: "Attendance", items: [{ href: "/attendance/live", label: "Live", icon: ClipboardCheck }, { href: "/attendance/review", label: "Review", icon: Bell }] },
  { label: "Management", items: [{ href: "/students", label: "Students", icon: Users }, { href: "/announcements", label: "Announcements", icon: Megaphone }, { href: "/reports", label: "Reports", icon: BarChart3 }] }
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
          "hidden h-screen shrink-0 overflow-hidden border-r border-slate-200/80 bg-white shadow-sm transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-20" : "w-72"
        )}
      >
        <SidebarContent collapsed={collapsed} onToggle={onToggle} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close sidebar" className="absolute inset-0 bg-slate-950/40" onClick={onMobileClose} />
          <aside className="relative h-full w-72 overflow-hidden border-r border-slate-200 bg-white shadow-2xl">
            <SidebarContent collapsed={false} onToggle={onMobileClose} mobile />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SidebarContent({ collapsed, onToggle, mobile }: { collapsed: boolean; onToggle: () => void; mobile?: boolean }) {
  const pathname = usePathname();
  const ToggleIcon = mobile ? X : collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex min-h-20 items-center border-b border-slate-200/80", collapsed ? "justify-center px-3" : "justify-between gap-3 p-5")}>
        {collapsed ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-sm font-black text-white">AA</div>
        ) : (
          <div className="min-w-0">
            <div className="truncate text-xl font-black tracking-tight text-slate-950">Attendance Admin</div>
            <div className="mt-1 truncate text-sm text-slate-500">Event attendance control</div>
          </div>
        )}
        <button
          type="button"
          aria-label={mobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={mobile ? "Close sidebar" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          <ToggleIcon size={19} />
        </button>
      </div>

      <nav aria-label="Admin navigation" className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto p-3", collapsed && "space-y-2 px-2")}> 
        {groups.map((group) => <div key={group.label}>
          {!collapsed ? <p className="mb-2 px-3 text-[11px] font-black uppercase tracking-widest text-slate-400">{group.label}</p> : null}
          <div className="space-y-1">{group.items.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex min-h-11 items-center rounded-xl text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-100",
                collapsed ? "justify-center px-0" : "gap-3 px-3 py-2",
                active
                  ? "bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <Icon className={cn("shrink-0", active ? "text-brand-700" : "text-slate-500 group-hover:text-slate-800")} size={collapsed ? 20 : 18} />
              {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
            </Link>
          );
          })}</div>
        </div>)}
      </nav>

      {collapsed ? null : (
        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <span className="font-bold text-slate-900">Admin tools</span>
            <br />
            Manage events, attendance, and reports from one workspace.
          </div>
        </div>
      )}
    </div>
  );
}
