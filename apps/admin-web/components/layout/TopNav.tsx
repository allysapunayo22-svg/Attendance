"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const pageMeta = [
  { match: /^\/$/, title: "Overview", description: "Operating summary and attendance signals." },
  { match: /^\/events/, title: "Event Management", description: "Create, publish, review, and export events." },
  { match: /^\/attendance\/live/, title: "Live Attendance", description: "Monitor time-ins, locations, and verification status." },
  { match: /^\/attendance\/review/, title: "Attendance Review", description: "Review evidence and resolve flagged records." },
  { match: /^\/students/, title: "Students", description: "Manage roster, profiles, and eligibility." },
  { match: /^\/announcements/, title: "Announcements", description: "Create updates and send event notices." },
  { match: /^\/reports/, title: "Reports", description: "Export attendance summaries and insights." }
];

const destinations = [
  { label: "Overview", description: "Operational summary", href: "/" },
  { label: "Events", description: "Create and manage events", href: "/events" },
  { label: "Create event", description: "Start a new event", href: "/events/new" },
  { label: "Live attendance", description: "Monitor submissions", href: "/attendance/live" },
  { label: "Attendance review", description: "Resolve flagged records", href: "/attendance/review" },
  { label: "Students", description: "Roster and accounts", href: "/students" },
  { label: "Announcements", description: "Student notices", href: "/announcements" },
  { label: "Reports", description: "Attendance exports", href: "/reports" }
];

export function TopNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const currentPage = useMemo(() => pageMeta.find((item) => item.match.test(pathname)) ?? pageMeta[0], [pathname]);
  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return destinations.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term)).slice(0, 5);
  }, [search]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="flex min-h-18 items-center gap-3 px-4 py-3 lg:px-6">
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={onOpenSidebar}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-brand-100 md:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden min-w-48 lg:block">
          <h2 className="text-base font-black text-slate-950">{currentPage?.title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{currentPage?.description}</p>
        </div>

        <div className="relative max-w-2xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10 shadow-inner focus:bg-white"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSearch("");
              if (event.key === "Enter" && matches[0]) { router.push(matches[0].href); setSearch(""); }
            }}
            placeholder="Go to a page or action…"
            aria-label="Search dashboard destinations"
          />
          {search.trim() ? (
            <div className="absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              {matches.map((item) => (
                <button key={item.href + item.label} type="button" onClick={() => { router.push(item.href); setSearch(""); }} className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-slate-50 focus:bg-slate-50">
                  <span><span className="block text-sm font-bold text-slate-950">{item.label}</span><span className="mt-0.5 block text-xs text-slate-500">{item.description}</span></span>
                  <span className="text-xs font-semibold text-slate-400">Open</span>
                </button>
              ))}
              {!matches.length ? <div className="px-3 py-5 text-center text-sm text-slate-500">No destination matches “{search}”.</div> : null}
            </div>
          ) : null}
        </div>

        <Button variant="outline" className="h-11 shrink-0 rounded-xl border-slate-200 px-3 sm:px-4" onClick={logout}>
          <LogOut size={16} />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
