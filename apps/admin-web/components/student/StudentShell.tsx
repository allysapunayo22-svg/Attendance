"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, Bell, CalendarDays, ClipboardCheck, Home, Megaphone, UserRound } from "lucide-react";
import { StudentLogoutButton } from "@/components/auth/StudentLogoutButton";
import { initials } from "@/lib/student/format";
import { studentQueryOptions, useStudentNotifications, useStudentProfile, useStudentRealtimeInvalidation } from "./hooks";
import { StudentPwaCoordinator } from "./pwa/StudentPwaCoordinator";

const navigation = [
  { href: "/student", label: "Home", icon: Home, exact: true },
  { href: "/student/events", label: "Events", icon: CalendarDays },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/student/announcements", label: "Notices", icon: Megaphone },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
  { href: "/student/profile", label: "Profile", icon: UserRound }
] as const;

const mobileNavigation = navigation.filter((item) => ["Home", "Events", "Attendance"].includes(item.label));

function isActive(pathname: string, item: (typeof navigation)[number]) {
  return "exact" in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useStudentProfile();
  const notificationsQuery = useStudentNotifications();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ from: string; href: string } | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useStudentRealtimeInvalidation();

  const profile = profileQuery.data;
  const unread = notificationsQuery.data?.filter((item) => !item.read_at).length ?? 0;
  const isHome = pathname === "/student";

  const prepareNavigation = useCallback((href: string) => {
    router.prefetch(href);
    if (href === "/student/events") void queryClient.prefetchQuery(studentQueryOptions.events());
    else if (href === "/student/attendance") void queryClient.prefetchQuery(studentQueryOptions.attendance());
    else if (href === "/student/announcements") void queryClient.prefetchQuery(studentQueryOptions.announcements());
    else if (href === "/student/notifications") void queryClient.prefetchQuery(studentQueryOptions.notifications());
    else if (href === "/student/profile") void queryClient.prefetchQuery(studentQueryOptions.profile());
  }, [queryClient, router]);

  const beginNavigation = useCallback((href: string) => {
    prepareNavigation(href);
    if (href !== pathname) setPendingNavigation({ from: pathname, href });
  }, [pathname, prepareNavigation]);

  const activePathname = pendingNavigation?.from === pathname ? pendingNavigation.href : pathname;

  useEffect(() => {
    if (!profileMenuOpen) return;
    const menu = profileMenuRef.current;
    const trigger = menu?.querySelector<HTMLButtonElement>("button[aria-haspopup]");
    menu?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    function closeOnOutsideClick(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) setProfileMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        trigger?.focus();
      }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) || !menu?.contains(document.activeElement)) return;
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      if (!items.length) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
    const closeOnBlur = (event: FocusEvent) => {
      if (!menu?.contains(event.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("focusin", closeOnBlur);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("focusin", closeOnBlur);
    };
  }, [profileMenuOpen]);

  return (
    <div className="student-app min-h-dvh bg-student-50 text-slate-950 lg:flex">
      <aside className="hidden min-h-dvh w-64 shrink-0 flex-col border-r border-student-200 bg-white p-5 text-slate-800 lg:flex">
        <Link href="/student" prefetch onPointerEnter={() => prepareNavigation("/student")} onFocus={() => prepareNavigation("/student")} onClick={() => beginNavigation("/student")} className="flex items-center gap-3 rounded-2xl p-2">
          <Image src="/logo.png" alt="ClickIn" width={44} height={44} className="h-11 w-11 rounded-2xl bg-white object-contain p-1" priority />
          <div><p className="font-black tracking-tight">ClickIn</p><p className="text-xs text-student-700/80">Student Attendance</p></div>
        </Link>
        <div className="mt-6 flex items-center gap-2 rounded-full border border-student-200 bg-student-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-student-800"><span className="h-2 w-2 rounded-full bg-student-400" /> CSU · CBEA</div>
        <nav aria-label="Student navigation" className="mt-6 space-y-1.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(activePathname, item);
            return <Link key={item.href} href={item.href} prefetch aria-current={active ? "page" : undefined} onPointerEnter={() => prepareNavigation(item.href)} onFocus={() => prepareNavigation(item.href)} onTouchStart={() => prepareNavigation(item.href)} onClick={() => beginNavigation(item.href)} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${active ? "bg-student-100 text-student-800 shadow-sm" : "text-slate-600 hover:bg-student-50 hover:text-student-800"}`}><Icon size={19} /><span className="flex-1">{item.label}</span>{item.label === "Notifications" && unread ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-rose-100 text-rose-700" : "bg-rose-500 text-white"}`}>{unread > 99 ? "99+" : unread}</span> : null}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-3xl border border-white/10 bg-white/10 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-student-100 text-xs font-black text-student-800">{initials(profile?.full_name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{profile?.full_name ?? "Student"}</p><p className="truncate text-xs text-student-700/75">{profile?.student_id ?? "Authenticated"}</p></div></div></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="student-safe-top relative z-40 border-b border-student-200 bg-white px-5 pb-3 text-slate-800">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link href="/student" prefetch onPointerEnter={() => prepareNavigation("/student")} onFocus={() => prepareNavigation("/student")} onClick={() => beginNavigation("/student")} className="flex items-center gap-2 rounded-full border border-student-200 bg-student-50 px-3 py-2"><span className="h-2 w-2 rounded-full bg-student-400" /><span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-student-800"><span className="sm:hidden">CSU · CBEA</span><span className="hidden sm:inline">CSU · CBEA Attendance</span></span></Link>
            <div className="flex items-center gap-2">
              <Link href="/student/notifications" prefetch onPointerEnter={() => prepareNavigation("/student/notifications")} onFocus={() => prepareNavigation("/student/notifications")} onTouchStart={() => prepareNavigation("/student/notifications")} onClick={() => beginNavigation("/student/notifications")} aria-label={unread ? `${unread} unread notifications` : "Notifications"} className="relative flex h-11 w-11 items-center justify-center rounded-full border border-student-200 bg-student-50 text-student-800 transition hover:bg-student-100"><Bell size={19} />{unread ? <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-student-100 bg-rose-500" /> : null}</Link>
              <div className="relative" ref={profileMenuRef}>
                <button type="button" aria-label="Open profile menu" aria-haspopup="menu" aria-expanded={profileMenuOpen} onClick={() => setProfileMenuOpen((open) => !open)} className="flex h-11 w-11 items-center justify-center rounded-full bg-student-100 text-xs font-black text-student-800 shadow-sm">{initials(profile?.full_name)}</button>
                {profileMenuOpen ? <ProfileMenu name={profile?.full_name} studentId={profile?.student_id} onClose={() => setProfileMenuOpen(false)} prepareNavigation={prepareNavigation} beginNavigation={beginNavigation} /> : null}
              </div>
            </div>
          </div>
        </header>

        <main className={`mx-auto w-full ${isHome ? "max-w-none px-0 pb-32 pt-0 lg:max-w-6xl lg:px-8 lg:pb-10 lg:pt-8" : "max-w-6xl px-4 pb-32 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10 lg:pt-8"}`}><StudentPwaCoordinator />{children}</main>

        <nav aria-label="Primary student navigation" className="student-floating-nav student-safe-bottom fixed inset-x-0 bottom-0 z-40 px-5 pt-2 lg:hidden">
          <div className="mx-auto grid h-[66px] max-w-[328px] grid-cols-3 items-center rounded-full border border-white/80 bg-white/95 px-2 shadow-[0_8px_32px_rgba(38,63,86,0.10)] backdrop-blur-xl">
            {mobileNavigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(activePathname, item);
              return <Link key={item.href} href={item.href} prefetch aria-current={active ? "page" : undefined} onPointerEnter={() => prepareNavigation(item.href)} onFocus={() => prepareNavigation(item.href)} onTouchStart={() => prepareNavigation(item.href)} onClick={() => beginNavigation(item.href)} className={`flex h-full flex-col items-center justify-center text-[10px] font-extrabold transition ${active ? "text-student-700" : "text-slate-500 hover:text-slate-800"}`}><span className={`flex h-10 w-10 items-center justify-center rounded-full transition ${active ? "bg-student-700 text-white shadow-sm" : ""}`}><Icon size={20} /></span><span className="mt-0.5">{item.label === "Attendance" ? "History" : item.label}</span></Link>;
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

function ProfileMenu({ name, studentId, onClose, prepareNavigation, beginNavigation }: { name: string | undefined; studentId: string | undefined; onClose: () => void; prepareNavigation: (href: string) => void; beginNavigation: (href: string) => void }) {
  return (
    <div role="menu" className="absolute right-0 top-14 w-60 overflow-hidden rounded-3xl border border-student-200 bg-white p-2 text-slate-900 shadow-[0_18px_50px_rgba(38,63,86,0.12)] backdrop-blur-2xl">
      <div className="flex items-center gap-3 border-b border-slate-200/70 p-2 pb-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-student-100 text-xs font-black text-student-800">{initials(name)}</span><div className="min-w-0"><p className="truncate text-xs font-extrabold">{name ?? "Student"}</p><p className="truncate text-[10px] font-semibold text-slate-500">ID: {studentId ?? "Student"}</p></div></div>
      <div className="space-y-0.5 pt-1"><MenuLink href="/student/profile" icon={UserRound} label="Profile" onClick={onClose} prepareNavigation={prepareNavigation} beginNavigation={beginNavigation} /><MenuLink href="/student/attendance" icon={BarChart3} label="Attendance standing" onClick={onClose} prepareNavigation={prepareNavigation} beginNavigation={beginNavigation} /><MenuLink href="/student/announcements" icon={Megaphone} label="Announcements" onClick={onClose} prepareNavigation={prepareNavigation} beginNavigation={beginNavigation} /><div className="my-1 h-px bg-slate-200/70" /><StudentLogoutButton menu /></div>
    </div>
  );
}

function MenuLink({ href, icon: Icon, label, onClick, prepareNavigation, beginNavigation }: { href: string; icon: typeof UserRound; label: string; onClick: () => void; prepareNavigation: (href: string) => void; beginNavigation: (href: string) => void }) {
  return <Link role="menuitem" href={href} prefetch onPointerEnter={() => prepareNavigation(href)} onFocus={() => prepareNavigation(href)} onTouchStart={() => prepareNavigation(href)} onClick={() => { beginNavigation(href); onClick(); }} className="flex min-h-10 items-center gap-3 rounded-2xl px-2.5 text-xs font-bold text-slate-700 transition hover:bg-white"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-student-700 shadow-sm"><Icon size={14} /></span>{label}</Link>;
}
