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

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const { data: todayRows, error: todayError } = await supabase
    .from("attendance_sessions")
    .select("id,status,sync_status,updated_at,time_in_server_timestamp,student:student_profiles(full_name,student_id),event:events(title)")
    .gte("created_at", startOfToday.toISOString())
    .lt("created_at", startOfTomorrow.toISOString());

  if (todayError) throw todayError;
  const countErrors = [students.error, upcoming.error, ongoing.error, pending.error, absence.error].filter(Boolean);
  if (countErrors[0]) throw countErrors[0];
  const resolved = todayRows?.filter((row) => ["verified", "completed", "time_in_recorded", "late", "excused"].includes(row.status)).length ?? 0;
  const attendanceRate = todayRows?.length ? Math.round((resolved / todayRows.length) * 100) : 0;
  const hourlyTraffic = Array.from({ length: 24 }, (_, hour) => ({
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date(2000, 0, 1, hour)),
    total: 0,
    verified: 0,
    flagged: 0
  }));

  for (const row of todayRows ?? []) {
    const hour = new Date(row.time_in_server_timestamp ?? row.updated_at).getHours();
    const bucket = hourlyTraffic[hour];
    if (!bucket) continue;
    bucket.total += 1;
    if (["verified", "completed", "time_in_recorded", "late", "excused"].includes(row.status)) bucket.verified += 1;
    if (row.status === "pending_verification" || row.sync_status === "requires_review") bucket.flagged += 1;
  }

  return {
    totalStudents: students.count ?? 0,
    upcomingEvents: upcoming.count ?? 0,
    ongoingEvents: ongoing.count ?? 0,
    attendanceToday: todayRows?.length ?? 0,
    present: todayRows?.filter((row) => ["verified", "completed", "time_in_recorded"].includes(row.status)).length ?? 0,
    late: todayRows?.filter((row) => row.status === "late").length ?? 0,
    absent: todayRows?.filter((row) => row.status === "missed").length ?? 0,
    pendingReviews: pending.count ?? 0,
    pendingAbsenceRequests: absence.count ?? 0,
    attendanceRate,
    hourlyTraffic,
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
