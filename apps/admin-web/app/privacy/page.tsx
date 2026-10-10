import Link from "next/link";
import { ArrowLeft, Camera, Clock3, FileCheck2, MapPin, ShieldCheck, UserRound } from "lucide-react";

const items = [
  { icon: MapPin, title: "Why location is collected", body: "Location verifies that an attendance submission was made inside the approved event area." },
  { icon: Camera, title: "Why photos are collected", body: "Live photos help authorized administrators confirm that the student personally submitted the attendance record." },
  { icon: Clock3, title: "When location is collected", body: "ClickIn requests location only while checking event eligibility, checking in, checking out, or refreshing attendance requirements. It does not continuously track students." },
  { icon: UserRound, title: "Who can review evidence", body: "Authorized administrators can review attendance evidence when verifying, correcting, or auditing an attendance record." },
  { icon: ShieldCheck, title: "Evidence protection", body: "Attendance evidence is stored privately and is governed by the event's configured retention period and access controls." },
  { icon: FileCheck2, title: "Corrections and questions", body: "Students can contact the CBEA office when their identity details are incorrect or an attendance result needs review." }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-dvh bg-student-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/register" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-student-700 hover:bg-white"><ArrowLeft size={16} /> Back to registration</Link>
        <header className="mt-5 rounded-3xl border border-student-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-student-700">ClickIn Student Attendance</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Attendance privacy notice</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">ClickIn collects attendance information only to establish event eligibility, record attendance, and support authorized review.</p>
        </header>
        <section className="mt-5 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body }) => <article key={title} className="rounded-2xl border border-student-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-student-100 text-student-700"><Icon size={19} /></span><h2 className="mt-4 font-semibold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p></article>)}
        </section>
      </div>
    </main>
  );
}
