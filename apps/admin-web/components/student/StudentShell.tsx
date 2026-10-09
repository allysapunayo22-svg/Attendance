"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ClipboardCheck, Home, Megaphone, UserRound } from "lucide-react";
import { StudentLogoutButton } from "@/components/auth/StudentLogoutButton";
import { initials } from "@/lib/student/format";
import { useStudentNotifications, useStudentProfile, useStudentRealtimeInvalidation } from "./hooks";
import { StudentPwaCoordinator } from "./pwa/StudentPwaCoordinator";

const navigation = [
  { href: "/student", label: "Home", icon: Home, exact: true },
  { href: "/student/events", label: "Events", icon: CalendarDays },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/student/announcements", label: "Notices", icon: Megaphone },
  { href: "/student/notifications", label: "Notifications", icon: Bell },
  { href: "/student/profile", label: "Profile", icon: UserRound }
] as const;

const mobileNavigation = navigation.filter((item) => ["Home", "Events", "Attendance", "Notices", "Profile"].includes(item.label));

function isActive(pathname: string, item: (typeof navigation)[number]) {
  return "exact" in item && item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profileQuery = useStudentProfile();
  const notificationsQuery = useStudentNotifications();
  useStudentRealtimeInvalidation();

  const profile = profileQuery.data;
  const unread = notificationsQuery.data?.filter((item) => !item.read_at).length ?? 0;

  return (
    <div className="min-h-dvh bg-[#f3f7f7] text-slate-950 lg:flex">
      <aside className="hidden min-h-dvh w-64 shrink-0 flex-col border-r border-teal-900/70 bg-[#0b2528] p-5 text-white lg:flex">
        <Link href="/student" className="flex items-center gap-3 rounded-2xl p-2"><Image src="/logo.png" alt="ClickIn" width={44} height={44} className="h-11 w-11 rounded-2xl bg-white object-contain p-1" priority /><div><p className="font-black tracking-tight">ClickIn</p><p className="text-xs text-teal-200">Student Portal</p></div></Link>
        <nav aria-label="Student navigation" className="mt-8 space-y-1.5">{navigation.map((item) => { const Icon = item.icon; const active = isActive(pathname, item); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${active ? "bg-white text-teal-950 shadow" : "text-teal-100 hover:bg-white/10 hover:text-white"}`}><Icon size={19} /><span className="flex-1">{item.label}</span>{item.label === "Notifications" && unread ? <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-rose-100 text-rose-700" : "bg-rose-500 text-white"}`}>{unread > 99 ? "99+" : unread}</span> : null}</Link>; })}</nav>
        <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-xs font-black">{initials(profile?.full_name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold">{profile?.full_name ?? "Student"}</p><p className="truncate text-xs text-teal-200">{profile?.student_id ?? "Authenticated"}</p></div></div><div className="mt-3"><StudentLogoutButton compact /></div></div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="student-safe-top sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 pb-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3"><Link href="/student" className="flex items-center gap-2"><Image src="/logo.png" alt="ClickIn" width={38} height={38} className="h-9 w-9 rounded-xl object-contain" priority /><span className="font-black tracking-tight text-teal-950">ClickIn</span></Link><div className="flex items-center gap-2"><Link href="/student/notifications" aria-label={unread ? `${unread} unread notifications` : "Notifications"} className="relative flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700"><Bell size={19} />{unread ? <span className="absolute right-1 top-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">{unread > 9 ? "9+" : unread}</span> : null}</Link><Link href="/student/profile" aria-label="Student profile" className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-800 text-xs font-black text-white">{initials(profile?.full_name)}</Link></div></div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-10 lg:pt-8"><StudentPwaCoordinator />{children}</main>

        <nav aria-label="Primary student navigation" className="student-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"><div className="mx-auto grid max-w-lg grid-cols-5">{mobileNavigation.map((item) => { const Icon = item.icon; const active = isActive(pathname, item); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition ${active ? "text-teal-800" : "text-slate-500 hover:text-slate-800"}`}><span className={`flex h-8 w-10 items-center justify-center rounded-full ${active ? "bg-teal-100" : ""}`}><Icon size={19} /></span><span>{item.label}</span></Link>; })}</div></nav>
      </div>
    </div>
  );
}
