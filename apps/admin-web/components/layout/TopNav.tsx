"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const destinations = [
  { label: "Overview", description: "Today’s attendance summary", href: "/" },
  { label: "Create New Event", description: "Set up an event", href: "/events/new" },
  { label: "Events", description: "Browse and edit campus events", href: "/events" },
  { label: "Live Attendance", description: "Monitor incoming check-ins", href: "/attendance/live" },
  { label: "Review Queue", description: "Resolve flagged attendance records", href: "/attendance/review" },
  { label: "Students", description: "Student accounts and IDs", href: "/students" },
  { label: "Announcements", description: "Broadcast updates", href: "/announcements" },
  { label: "Reports", description: "Filter and export attendance", href: "/reports" },
  { label: "Profile", description: "View administrator account", href: "/profile" }
];

type AdminProfile = { full_name: string; email: string };

export function TopNav({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileContainerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");
  const [activeResult, setActiveResult] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<AdminProfile>({ full_name: "System Admin", email: "admin@csu.edu.ph" });

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return destinations.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(term)).slice(0, 6);
  }, [search]);

  const initials = profile.full_name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "AD";

  useEffect(() => { setActiveResult(0); }, [search]);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const { data: admin } = await supabase.from("admin_profiles").select("full_name,email").eq("user_id", user.id).maybeSingle();
      setProfile({
        full_name: admin?.full_name || user.user_metadata?.full_name || "System Admin",
        email: admin?.email || user.email || "admin@csu.edu.ph"
      });
    });
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && document.activeElement?.tagName !== "INPUT")) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSearch("");
        setProfileOpen(false);
      }
    }
    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) setSearch("");
      if (!profileContainerRef.current?.contains(event.target as Node)) setProfileOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    return () => { window.removeEventListener("keydown", handleKeyDown); document.removeEventListener("mousedown", handlePointerDown); };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="grid min-h-[68px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 lg:px-7">
        <button type="button" aria-label="Open sidebar" onClick={onOpenSidebar} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"><Menu size={20} /></button>
        <div className="hidden md:block" />

        <div ref={searchContainerRef} className="relative mx-auto w-full max-w-[540px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <Input
            ref={searchInputRef}
            className="h-11 rounded-xl border-0 bg-slate-100/90 pl-11 pr-16 text-sm text-slate-700 shadow-none ring-1 ring-slate-200/40 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") { event.preventDefault(); setActiveResult((index) => Math.min(index + 1, Math.max(matches.length - 1, 0))); }
              if (event.key === "ArrowUp") { event.preventDefault(); setActiveResult((index) => Math.max(index - 1, 0)); }
              if (event.key === "Enter" && matches[activeResult]) { router.push(matches[activeResult].href); setSearch(""); }
            }}
            placeholder="Search students, events, or shortcuts…"
            aria-label="Search admin screens"
            role="combobox"
            aria-expanded={Boolean(search.trim())}
            aria-controls="dashboard-search-results"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 text-[11px] font-medium text-slate-400 sm:block">Ctrl + K</span>
          {search.trim() ? <div id="dashboard-search-results" role="listbox" className="absolute left-0 right-0 top-13 z-40 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl">{matches.map((item, index) => <button key={item.href} type="button" role="option" aria-selected={index === activeResult} onMouseEnter={() => setActiveResult(index)} onClick={() => { router.push(item.href); setSearch(""); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${index === activeResult ? "bg-brand-50" : "hover:bg-slate-50"}`}><span><span className="block text-sm font-semibold text-slate-900">{item.label}</span><span className="block text-xs text-slate-500">{item.description}</span></span><span className="text-xs font-semibold text-brand-700">Open</span></button>)}{!matches.length ? <div className="px-3 py-4 text-center text-sm text-slate-500">No matching screen</div> : null}</div> : null}
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4">
          <Link href="/attendance/review" aria-label="Open review queue" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950"><Bell size={19} /><span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" /></Link>
          <div ref={profileContainerRef} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-xl p-1.5 pr-2 text-left hover:bg-slate-100">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-800 text-xs font-bold text-white shadow-sm">{initials}</span>
              <span className="hidden min-w-0 lg:block"><span className="block max-w-32 truncate text-sm font-semibold text-slate-900">{profile.full_name}</span><span className="block text-[11px] text-slate-500">Administrator</span></span>
              <ChevronDown size={14} className={`hidden text-slate-500 transition sm:block ${profileOpen ? "rotate-180" : ""}`} />
            </button>
            {profileOpen ? <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl"><div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-semibold text-slate-900">{profile.full_name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{profile.email}</p></div><div className="py-1"><Link role="menuitem" href="/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950"><UserRound size={17} /> View profile</Link><button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"><LogOut size={17} /> Logout</button></div></div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
