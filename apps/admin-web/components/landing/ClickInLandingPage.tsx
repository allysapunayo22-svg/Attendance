import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck2,
  Camera,
  CheckCircle2,
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

export function ClickInLandingPage() {
  return (
    <div className="h-dvh overflow-hidden bg-white text-slate-950 md:min-h-dvh md:h-auto md:overflow-visible">
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/95 pt-[env(safe-area-inset-top)] shadow-[0_1px_12px_rgba(15,23,42,0.04)] backdrop-blur-xl md:pt-0">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="#home" className="flex items-center gap-2.5" aria-label="ClickIn home">
            <Image src="/logo.png" alt="" width={38} height={38} className="h-9 w-9 rounded-xl object-contain" priority />
            <span className="text-xl font-black tracking-tight text-slate-950">ClickIn</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 md:flex">
            {navigation.map((item) => <a key={item.href} href={item.href} className="text-sm font-semibold text-slate-600 transition hover:text-blue-600">{item.label}</a>)}
          </nav>
          <Link href="/login" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"><UserRoundCheck size={17} /> Login</Link>
        </div>
      </header>

      <main>
        <section id="home" className="h-[calc(100dvh-4rem-env(safe-area-inset-top))] scroll-mt-24 overflow-hidden bg-blue-50 md:h-auto">
          <div className="mx-auto flex h-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:grid md:h-auto md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-8 md:py-14 lg:gap-10 lg:px-8 lg:py-20">
            <div className="max-w-2xl">
              <p className="hidden items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-bold text-blue-700 md:inline-flex"><ShieldCheck size={15} /> A Smarter Way to Track Student Attendance</p>
              <h1 className="text-[clamp(1.9rem,8.5vw,2.5rem)] font-black leading-[1.06] tracking-[-0.035em] text-slate-950 md:mt-5 md:text-5xl lg:text-6xl">Smart Student Attendance <span className="text-blue-600">Made Easy</span></h1>
              <p className="mt-3 max-w-xl text-sm leading-5 text-slate-600 md:hidden">Access events, securely mark attendance, and track your records in one reliable platform.</p>
              <p className="mt-5 hidden max-w-xl text-lg leading-8 text-slate-600 md:block">ClickIn helps students easily access events, mark attendance, verify location, scan QR codes, submit required evidence, and monitor attendance history in one secure platform.</p>
              <div className="mt-4 md:mt-7">
                <Link href="/login" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 md:min-h-12 md:px-6">Get Started <ArrowRight size={17} /></Link>
              </div>
              <div className="mt-8 hidden max-w-xl gap-3 md:grid md:grid-cols-3">
                <Highlight icon={UserRoundCheck} title="For Students" />
                <Highlight icon={ShieldCheck} title="Secure & Reliable" />
                <Highlight icon={WifiOff} title="Offline Ready" />
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-end justify-center md:block md:flex-none">
              <div aria-hidden="true" className="absolute inset-1 rounded-[2rem] bg-blue-100/70 blur-xl md:-inset-5 md:rounded-[2.5rem] md:blur-2xl" />
              <div className="relative h-full max-h-full w-full overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 shadow-[0_16px_45px_rgba(30,58,138,0.16)] md:aspect-[3/2] md:h-auto md:rounded-3xl md:bg-white md:shadow-[0_24px_70px_rgba(30,58,138,0.18)]">
                <Image src="/BG.jpeg" alt="" fill aria-hidden="true" sizes="(max-width: 767px) calc(100vw - 2rem), 1px" className="scale-110 object-cover object-center opacity-20 blur-lg md:hidden" />
                <Image src="/BG.jpeg" alt="ClickIn student attendance verification on campus" fill priority sizes="(max-width: 767px) calc(100vw - 2rem), 58vw" className="object-contain object-bottom md:object-cover md:object-center" />
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
