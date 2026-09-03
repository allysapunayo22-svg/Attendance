"use client";

import { supabase } from "./supabase";

export async function fetchDashboardStats() {
  const [students, upcoming, ongoing, pending, absence] = await Promise.all([
    supabase.from("student_profiles").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("status", "ongoing"),
    supabase.from("attendance_sessions").select("id", { count: "exact", head: true }).or("status.eq.pending_verification,sync_status.eq.requires_review"),
    supabase.from("absence_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review"])
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayRows, error: todayError } = await supabase
    .from("attendance_sessions")
    .select("id,status,sync_status,updated_at,student:student_profiles(full_name,student_id),event:events(title)")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  if (todayError) throw todayError;
  const resolved = todayRows?.filter((row) => ["verified", "completed", "time_in_recorded", "late", "excused"].includes(row.status)).length ?? 0;
  const attendanceRate = todayRows?.length ? Math.round((resolved / todayRows.length) * 100) : 0;

  return {
    totalStudents: students.count ?? 0,
    upcomingEvents: upcoming.count ?? 0,
    ongoingEvents: ongoing.count ?? 0,
    attendanceToday: todayRows?.length ?? 0,
    present: todayRows?.filter((row) => ["verified", "completed", "time_in_recorded"].includes(row.status)).length ?? 0,
    late: todayRows?.filter((row) => row.status === "late").length ?? 0,
    absent: todayRows?.filter((row) => row.status === "missed").length ?? 0,
    pendingReviews: pending.count ?? 0,
    pendingAbsenceRequests: absence.count ?? 0
    ,attendanceRate,
    recentActivity: [...(todayRows ?? [])].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 6)
  };
}

export async function fetchEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*, schedule:event_schedules(*), location:event_locations(*), registrations:event_registrations(count), attendance:attendance_sessions(status)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchEventsPage(pageIndex: number, pageSize: number) {
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await supabase
    .from("events")
    .select("*, schedule:event_schedules(*), location:event_locations(*), registrations:event_registrations(count), attendance:attendance_sessions(status)", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { rows: data ?? [], count: count ?? 0 };
}

export async function fetchLiveAttendance() {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select("*, student:student_profiles(full_name,student_id), event:events(title)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data ?? [];
}

export async function fetchStudents() {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("*, course:courses(code,name), section:sections(name)")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
