import type { Metadata } from "next";
import { StudentShell } from "@/components/student/StudentShell";
import { requireStudent } from "@/lib/auth/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "ClickIn Student Portal",
  description: "Student events, attendance, announcements, and notifications"
};

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return <StudentShell>{children}</StudentShell>;
}
