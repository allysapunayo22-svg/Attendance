"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, CalendarPlus, CheckCircle2, Command, LogOut, Menu, Plus, Radio, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const pageMeta = [
  { match: /^\/$/, title: "Operations Console", description: "Campus live signals and administrative summary." },
  { match: /^\/events\/new/, title: "Create New Event", description: "Define geofence boundaries, schedule, and attendance windows." },
  { match: /^\/events/, title: "Event Management", description: "Supervise campus events, geofences, and attendance rules." },
  { match: /^\/attendance\/live/, title: "Live Attendance Radar", description: "Realtime incoming student check-ins and device telemetries." },
  { match: /^\/attendance\/review/, title: "Attendance Review Queue", description: "Inspect submitted evidence photos, GPS offsets, and verify claims." },
  { match: /^\/students/, title: "Student Roster", description: "Manage student accounts, CSU student IDs, and verification status." },
  { match: /^\/announcements/, title: "Announcements & Broadcasts", description: "Publish urgent notices directly to student mobile devices." },
  { match: /^\/reports/, title: "Reports & Analytics", description: "Export CSV/PDF attendance registers and compliance analytics." }
];

const destinations = [
  { label: "Operations Overview", description: "Operational summary & stats", href: "/" },
  { label: "Create New Event", description: "Set up geofence & schedule", href: "/events/new" },
  { label: "Event Management", description: "Browse and edit campus events", href: "/events" },
  { label: "Live Attendance Radar", description: "Monitor incoming time-ins", href: "/attendance/live" },
  { label: "Review Queue", description: "Resolve flagged attendance records", href: "/attendance/review" },
  { label: "Student Roster", description: "Student accounts and IDs", href: "/students" },
  { label: "Announcements", description: "Broadcast updates to mobile app", href: "/announcements" },
  { label: "Reports & Exports", description: "Export attendance sheets", href: "/reports" }
];

export function TopNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");

  const currentPage = useMemo(() => pageMeta.find((item) => item.match.test(pathname)) ?? pageMeta[0], [pathname]);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return destinations.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term)).slice(0, 5);
  }, [search]);

  // Global keyboard shortcut to focus search: '/' or 'Ctrl+K' / 'Cmd+K'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex min-h-18 items-center justify-between gap-3 px-4 py-3 lg:px-6">
        {/* Mobile toggle & Breadcrumb Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open sidebar"
            onClick={onOpenSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-100 md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden sm:block">
            <h2 className="text-base font-black tracking-tight text-slate-950">{currentPage?.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{currentPage?.description}</p>
          </div>
        </div>

        {/* Global Quick Search Bar */}
        <div className="relative max-w-lg flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <Input
            ref={searchInputRef}
            className="h-10 rounded-xl border-slate-200/90 bg-slate-50/80 pl-10 pr-12 text-sm shadow-inner transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearch("");
              if (event.key === "Enter" && matches[0]) {
                router.push(matches[0].href);
                setSearch("");
              }
            }}
            placeholder="Search screens, actions, or jump to… (⌘K)"
            aria-label="Search dashboard destinations"
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:flex">
            ⌘K
          </div>

          {search.trim() ? (
            <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {matches.map((item) => (
                <button
                  key={item.href + item.label}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    setSearch("");
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition hover:bg-blue-50/70 focus:bg-blue-50"
                >
                  <div>
                    <span className="block text-sm font-bold text-slate-950">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.description}</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-600">Jump →</span>
                </button>
              ))}
              {!matches.length ? (
                <div className="px-3 py-4 text-center text-sm text-slate-500">No screen matches “{search}”.</div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Action Controls: Live Status & Create Event Button */}
        <div className="flex items-center gap-2.5">
          {/* Live System Indicator */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-800 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span>Realtime Geofence</span>
          </div>

          {/* Quick Create Event Button */}
          <Button
            asChild
            className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98]"
          >
            <Link href="/events/new">
              <Plus size={15} />
              <span className="hidden sm:inline">New Event</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
