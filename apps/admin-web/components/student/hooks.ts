"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  fetchStudentAnnouncements,
  fetchStudentAttendance,
  fetchStudentAttendanceDetail,
  fetchStudentEvent,
  fetchStudentEvents,
  fetchStudentNotifications,
  fetchStudentProfile
} from "@/lib/student/data";
import { studentQueryKeys } from "@/lib/student/query-keys";

const standardQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: true
} as const;

export function useStudentProfile() {
  return useQuery({ queryKey: studentQueryKeys.profile, queryFn: fetchStudentProfile, staleTime: 60_000 });
}

export function useStudentEvents() {
  return useQuery({ queryKey: studentQueryKeys.events, queryFn: fetchStudentEvents, ...standardQueryOptions });
}

export function useStudentEvent(eventId: string) {
  return useQuery({
    queryKey: studentQueryKeys.event(eventId),
    queryFn: () => fetchStudentEvent(eventId),
    enabled: Boolean(eventId),
    ...standardQueryOptions
  });
}

export function useStudentAttendance() {
  return useQuery({ queryKey: studentQueryKeys.attendance, queryFn: fetchStudentAttendance, ...standardQueryOptions });
}

export function useStudentAttendanceDetail(attendanceId: string) {
  return useQuery({
    queryKey: studentQueryKeys.attendanceDetail(attendanceId),
    queryFn: () => fetchStudentAttendanceDetail(attendanceId),
    enabled: Boolean(attendanceId),
    ...standardQueryOptions
  });
}

export function useStudentAnnouncements() {
  return useQuery({ queryKey: studentQueryKeys.announcements, queryFn: fetchStudentAnnouncements, staleTime: 60_000, refetchOnWindowFocus: true });
}

export function useStudentNotifications() {
  return useQuery({ queryKey: studentQueryKeys.notifications, queryFn: fetchStudentNotifications, ...standardQueryOptions });
}

export function useStudentRealtimeInvalidation() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidateEvents = () => void queryClient.invalidateQueries({ queryKey: studentQueryKeys.events });
    const channel = supabase
      .channel("student-web-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_schedules" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_locations" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "event_zones" }, invalidateEvents)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_sessions" }, () => void queryClient.invalidateQueries({ queryKey: studentQueryKeys.attendance }))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => void queryClient.invalidateQueries({ queryKey: studentQueryKeys.announcements }))
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void queryClient.invalidateQueries({ queryKey: studentQueryKeys.notifications }))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
