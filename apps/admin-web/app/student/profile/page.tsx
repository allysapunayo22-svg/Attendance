"use client";

import { GraduationCap, IdCard, Mail, ShieldCheck, Users } from "lucide-react";
import { StudentPageHeader } from "@/components/student/StudentPageHeader";
import { StudentError, StudentPageLoading } from "@/components/student/StudentStates";
import { StudentStatusBadge } from "@/components/student/StudentStatusBadge";
import { useStudentProfile } from "@/components/student/hooks";
import { initials } from "@/lib/student/format";

export default function StudentProfilePage() {
  const query = useStudentProfile();
  if (query.isLoading) return <StudentPageLoading title="Profile" description="Loading your verified student information" />;
  if (query.isError) return <StudentError message="Your student profile could not be loaded." retry={() => void query.refetch()} />;
  const profile = query.data;
  if (!profile) return <StudentError message="No active student profile is available for this account." retry={() => void query.refetch()} />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <StudentPageHeader title="Profile" description="Your verified student and academic information" />
      <section className="rounded-3xl border border-student-200 bg-student-50 p-6 text-slate-800 shadow-sm sm:p-8"><div className="flex items-center gap-4"><span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl font-black ring-1 ring-white/20">{initials(profile.full_name)}</span><div className="min-w-0"><h1 className="truncate text-2xl font-black">{profile.full_name}</h1><p className="mt-1 text-sm text-student-700">Student ID: {profile.student_id}</p><div className="mt-3"><StudentStatusBadge value={profile.is_active ? "verified" : "rejected"} /></div></div></div></section>
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><h2 className="font-extrabold text-slate-950">Academic information</h2><dl className="mt-4 divide-y divide-slate-100"><ProfileRow icon={GraduationCap} label="Course" value={profile.course ? `${profile.course.name} (${profile.course.code})` : "Not assigned"} /><ProfileRow icon={Users} label="Section" value={profile.section?.name ?? "Not assigned"} /><ProfileRow icon={IdCard} label="Year level" value={profile.year_level ? `Year ${profile.year_level}` : "Not assigned"} /><ProfileRow icon={Mail} label="School email" value={profile.email} /></dl></section>
      <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-blue-700" size={20} /><div><h2 className="font-bold text-blue-950">Roster-protected identity</h2><p className="mt-1 text-sm leading-6 text-blue-800">Student ID, name, email, course, section, year level, role, and account status are managed through the verified school roster. Contact an administrator if any information is incorrect.</p></div></div></section>
    </div>
  );
}

function ProfileRow({ icon: Icon, label, value }: { icon: typeof GraduationCap; label: string; value: string }) {
  return <div className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-student-50 text-student-700"><Icon size={18} /></span><div className="min-w-0"><dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</dd></div></div>;
}
