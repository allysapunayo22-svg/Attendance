"use client";

import { usePathname } from "next/navigation";
import { StudentDashboardLoading, StudentPageLoading } from "@/components/student/StudentStates";

const pageTitles: Record<string, string> = {
  events: "Events",
  attendance: "Attendance",
  announcements: "Announcements",
  notifications: "Notifications",
  profile: "Profile"
};

export default function StudentRouteLoading() {
  const pathname = usePathname();
  const section = pathname.split("/")[2] ?? "";
  if (!section) return <StudentDashboardLoading />;
  return <StudentPageLoading title={pageTitles[section] ?? "Student Portal"} />;
}
