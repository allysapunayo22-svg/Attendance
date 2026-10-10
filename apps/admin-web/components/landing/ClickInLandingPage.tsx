import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  History,
  LocateFixed,
  LockKeyhole,
  MapPinCheck,
  Megaphone,
  MonitorSmartphone,
  QrCode,
  ShieldCheck,
  UserRoundCheck,
  WifiOff
} from "lucide-react";

const navigation = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "About", href: "#about" }
];

const features = [
  { icon: CalendarCheck2, title: "Assigned Events", description: "See the campus events assigned to your account and their attendance windows." },
  { icon: QrCode, title: "QR Attendance", description: "Scan secure event QR codes as part of the attendance verification process." },
  { icon: LocateFixed, title: "GPS / Geofencing", description: "Confirm that attendance is submitted from an approved event location." },
  { icon: Camera, title: "Selfie / Camera Verification", description: "Capture required attendance evidence directly from your phone or browser." },
  { icon: Clock3, title: "Check-In and Check-Out", description: "Complete both attendance actions through one clear, guided workflow." },
  { icon: History, title: "Attendance History", description: "Review authoritative attendance records, timestamps, and verification status." },
  { icon: MapPinCheck, title: "Attendance Progress", description: "Understand your current standing across completed required events." },
  { icon: Megaphone, title: "Announcements", description: "Read general and event-specific notices available to your account." },
  { icon: Bell, title: "Notifications", description: "Receive attendance decisions, schedule changes, and event reminders." },
  { icon: WifiOff, title: "Offline Support / Sync", description: "Queue eligible attendance attempts offline and sync safely after reconnecting." },
  { icon: MonitorSmartphone, title: "Device Registration", description: "Register and verify the browser or device used for secure attendance." },
  { icon: LockKeyhole, title: "Password Recovery", description: "Recover access through the existing secure email-based reset flow." },
  { icon: Download, title: "PWA / Add to Home Screen", description: "Install ClickIn for fast standalone access on supported phones and computers." }
];

const steps = [
  { icon: CalendarCheck2, title: "Find Your Event", description: "Open ClickIn and view the events assigned to your student account." },
  { icon: QrCode, title: "Mark Attendance", description: "Scan the QR code, verify GPS, and capture any required evidence." },
  { icon: History, title: "Track Attendance", description: "View your history, progress, announcements, and notifications." }
];

const mobileFeatures = [
  { icon: QrCode, label: "QR Attendance", description: "Scan QR codes to mark attendance." },
  { icon: LocateFixed, label: "GPS Verification", description: "Ensure you’re at the event location." },
  { icon: Camera, label: "Camera Evidence", description: "Capture a selfie when required." },
  { icon: History, label: "Attendance History", description: "View your past attendance records." },
  { icon: WifiOff, label: "Offline Sync", description: "Works offline and syncs automatically." }
];

export function ClickInLandingPage() {
  return (
    <div className="h-dvh overflow-hidden bg-white text-slate-950 md:min-h-dvh md:h-auto md:overflow-visible">
      <header className="absolute inset-x-0 top-0 z-50 border-b border-transparent bg-transparent pt-[env(safe-area-inset-top)] md:sticky md:border-blue-100 md:bg-white/95 md:pt-0 md:shadow-[0_1px_12px_rgba(15,23,42,0.04)] md:backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="#home" className="flex items-center gap-2.5" aria-label="ClickIn home">
            <Image src="/logo.png" alt="" width={38} height={38} className="h-9 w-9 rounded-xl object-contain" priority />
            <span className="text-xl font-black tracking-tight text-blue-950 md:text-slate-950">ClickIn</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            {navigation.map((item) => <a key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-blue-600">{item.label}</a>)}
          </nav>
          <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-blue-400/40 bg-gradient-to-r from-sky-500 to-blue-600 px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(37,99,235,0.25)] transition hover:from-sky-600 hover:to-blue-700 md:border-transparent md:bg-blue-600 md:hover:bg-blue-700"><UserRoundCheck size={17} /> Login</Link>
        </div>
      </header>

      <main>
        <section id="home" className="relative h-dvh overflow-hidden bg-blue-50 md:hidden">
          <Image src="/BG.jpeg" alt="" fill priority sizes="100vw" className="object-cover object-[55%_center]" />
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,rgba(239,246,255,0.99)_0%,rgba(239,246,255,0.92)_52%,rgba(219,234,254,0.04)_74%),linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_52%,rgba(219,234,254,0.2)_100%)]" />
          <div className="relative z-10 h-full px-4 pt-[calc(5rem+env(safe-area-inset-top))] text-blue-950">
            <div className="max-w-[88%]">
              <p className="inline-flex items-center rounded-full border border-blue-300/70 bg-white/45 px-3 py-1.5 text-[clamp(0.65rem,2.8vw,0.78rem)] font-semibold text-blue-700 shadow-sm backdrop-blur-md">A Smarter Way to Track Student Attendance</p>
              <h1 className="mt-[clamp(0.65rem,2vh,1rem)] max-w-[18rem] text-[clamp(2rem,9.8vw,2.65rem)] font-black leading-[0.98] tracking-[-0.04em]">Smart Student Attendance <span className="text-blue-600">Made Easy</span></h1>
              <p className="mt-[clamp(0.55rem,1.7vh,0.8rem)] max-w-[15.5rem] text-[clamp(0.75rem,3.5vw,0.9rem)] font-medium leading-[1.35] text-blue-950/80">Access events, securely mark attendance, and track your records in one reliable platform.</p>
              <Link href="/login" className="mt-[clamp(0.65rem,2vh,1rem)] inline-flex min-h-11 min-w-40 items-center justify-center gap-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 text-sm font-extrabold text-white shadow-[0_10px_26px_rgba(37,99,235,0.3)] transition hover:from-sky-600 hover:to-blue-700">Get Started <ArrowRight size={19} /></Link>
            </div>
          </div>

          <div className="absolute inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-20 rounded-[1.55rem] border border-white/75 bg-blue-50/75 p-2.5 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl">
            <div className="px-1 pb-1.5">
              <h2 className="text-lg font-black leading-none tracking-tight text-blue-950">Student Essentials</h2>
              <p className="mt-1 text-[11px] font-medium text-blue-950/60">All the features you need in one place.</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {mobileFeatures.map(({ icon: Icon, label, description }, index) => (
                <div key={label} className={`flex h-[clamp(2.6rem,7.4vh,3rem)] items-center gap-2 overflow-hidden rounded-2xl border border-white/90 bg-white/80 px-2 shadow-sm ${index === mobileFeatures.length - 1 ? "col-span-2" : ""}`}>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100/90 text-blue-600"><Icon size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[clamp(0.65rem,2.9vw,0.78rem)] font-extrabold leading-tight text-blue-950">{label}</span>
                    <span className="mt-0.5 line-clamp-2 text-[clamp(0.48rem,2vw,0.6rem)] leading-[1.15] text-blue-950/65">{description}</span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-blue-400" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hidden scroll-mt-24 overflow-hidden bg-blue-50 md:block">
          <div className="mx-auto grid max-w-7xl grid-cols-[0.9fr_1.1fr] items-center gap-8 px-6 py-14 lg:gap-10 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700"><ShieldCheck size={15} /> A Smarter Way to Track Student Attendance</p>
              <h1 className="mt-5 text-5xl font-black leading-[1.06] tracking-[-0.035em] text-slate-950 lg:text-6xl">Smart Student Attendance <span className="text-blue-600">Made Easy</span></h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">ClickIn helps students easily access events, mark attendance, verify location, scan QR codes, submit required evidence, and monitor attendance history in one secure platform.</p>
              <div className="mt-7">
                <Link href="/login" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700">Get Started <ArrowRight size={17} /></Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                <Highlight icon={UserRoundCheck} title="For Students" />
                <Highlight icon={ShieldCheck} title="Secure & Reliable" />
                <Highlight icon={WifiOff} title="Offline Ready" />
              </div>
            </div>

            <div className="relative">
              <div aria-hidden="true" className="absolute -inset-5 rounded-[2.5rem] bg-blue-100/70 blur-2xl" />
              <div className="relative aspect-[3/2] overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-[0_24px_70px_rgba(30,58,138,0.18)]">
                <Image src="/BG.jpeg" alt="ClickIn student attendance verification on campus" fill priority sizes="58vw" className="object-cover object-center" />
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20" />
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="hidden scroll-mt-24 bg-white py-16 md:block sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Student features" title="Everything Students Need in One Platform" description="From finding an assigned event to reviewing the final attendance record, ClickIn keeps every student action clear and accessible." />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <article key={title} className="group rounded-2xl border border-blue-100 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_12px_34px_rgba(37,99,235,0.09)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Icon size={21} /></span>
                  <h3 className="mt-4 font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="hidden scroll-mt-24 border-y border-blue-100 bg-blue-50 py-16 md:block sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Simple and secure" title="How ClickIn Works" description="Complete attendance in three straightforward steps." />
            <div className="relative mt-10 grid gap-4 md:grid-cols-3">
              <div aria-hidden="true" className="absolute left-[16.7%] right-[16.7%] top-10 hidden h-px bg-blue-200 md:block" />
              {steps.map(({ icon: Icon, title, description }, index) => (
                <article key={title} className="relative rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm"><Icon size={22} /></span><span className="text-sm font-black text-blue-300">0{index + 1}</span></div>
                  <h3 className="mt-5 text-lg font-extrabold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="hidden scroll-mt-24 bg-white py-16 md:block sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-3xl bg-blue-900 px-6 py-10 text-center text-white shadow-[0_20px_60px_rgba(30,58,138,0.18)] sm:px-10 sm:py-14">
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-200">ClickIn Student Attendance</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Ready to Use ClickIn?</h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">Access your events and attendance records anytime, anywhere.</p>
              <Link href="/login" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-blue-900 shadow-sm transition hover:bg-blue-50">Login or Register <ArrowRight size={17} /></Link>
              <p className="mx-auto mt-6 max-w-2xl text-xs leading-6 text-blue-200">Built for secure, student-friendly campus attendance with verified identity, location, evidence, and offline support.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="hidden border-t border-blue-100 bg-blue-50 md:block">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3"><Image src="/logo.png" alt="" width={36} height={36} className="h-9 w-9 rounded-xl object-contain" /><div><p className="font-black text-slate-950">ClickIn</p><p className="text-xs text-slate-500">Student Attendance System</p></div></div>
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-600">
            {navigation.map((item) => <a key={item.href} href={item.href} className="hover:text-blue-600">{item.label}</a>)}
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/forgot-password" className="hover:text-blue-600">Help / Support</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Highlight({ icon: Icon, title }: { icon: typeof CheckCircle2; title: string }) {
  return <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-blue-200"><Icon size={16} /></span>{title}</div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2><p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">{description}</p></div>;
}
