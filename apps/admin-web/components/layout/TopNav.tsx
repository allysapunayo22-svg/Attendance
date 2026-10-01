"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const destinations = [
  { label: "Overview", description: "Today’s attendance summary", href: "/" },
  { label: "Create New Event", description: "Set up geofence & schedule", href: "/events/new" },
  { label: "Event Management", description: "Browse and edit campus events", href: "/events" },
  { label: "Live Attendance", description: "Monitor incoming check-ins", href: "/attendance/live" },
  { label: "Review Queue", description: "Resolve flagged attendance records", href: "/attendance/review" },
  { label: "Student Roster", description: "Student accounts and IDs", href: "/students" },
  { label: "Announcements", description: "Broadcast updates to mobile app", href: "/announcements" },
  { label: "Reports & Exports", description: "Export attendance sheets", href: "/reports" }
];

export function TopNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [activeResult, setActiveResult] = useState(0);

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return destinations.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term)).slice(0, 5);
  }, [search]);

  useEffect(() => { setActiveResult(0); }, [search]);

  // Global keyboard shortcut to focus search: '/' or 'Ctrl+K' / 'Cmd+K'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && document.activeElement?.tagName !== "INPUT")) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearch("");
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); document.removeEventListener("mousedown", handlePointerDown); };
  }, []);

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

        </div>

        {/* Global Quick Search Bar */}
        <div ref={searchContainerRef} className="relative max-w-lg flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <Input
            ref={searchInputRef}
            className="h-10 rounded-xl border-slate-200/90 bg-slate-50/80 pl-10 pr-12 text-sm shadow-inner transition focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearch("");
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult((index) => Math.min(index + 1, Math.max(matches.length - 1, 0))); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult((index) => Math.max(index - 1, 0)); }
              if (event.key === "Enter" && matches[activeResult]) {
                router.push(matches[activeResult].href);
                setSearch("");
              }
            }}
            placeholder="Jump to a screen… (Ctrl/⌘ K)"
            aria-label="Search dashboard destinations"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={Boolean(search.trim())}
            aria-controls="dashboard-search-results"
            aria-activedescendant={matches[activeResult] ? `dashboard-result-${activeResult}` : undefined}
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 sm:flex">
            ⌘K
          </div>

          {search.trim() ? (
            <div id="dashboard-search-results" role="listbox" className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">
              {matches.map((item, index) => (
                <button
                  id={`dashboard-result-${index}`}
                  key={item.href + item.label}
                  type="button"
                  role="option"
                  aria-selected={index === activeResult}
                  onMouseEnter={() => setActiveResult(index)}
                  onClick={() => {
                    router.push(item.href);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${index === activeResult ? "bg-blue-50" : "hover:bg-blue-50/70"}`}
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

        {/* Primary action */}
        <div className="flex items-center gap-2.5">
          {/* Quick Create Event Button */}
          <Button
            asChild
            className="h-10 rounded-xl bg-brand-700 hover:bg-brand-800 px-4 text-xs font-bold text-white shadow-sm transition active:scale-[0.98]"
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
