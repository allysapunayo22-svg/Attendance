"use client";

import { useEffect } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
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
import type { StudentAttendanceRecord } from "@/lib/student/types";
import type { Event } from "@attendance/types";

const standardQueryOptions = {
  staleTime: 2 * 60_000,
  gcTime: 30 * 60_000,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true
} as const;

export const studentQueryOptions = {
  profile: () => queryOptions({ queryKey: studentQueryKeys.profile, queryFn: fetchStudentProfile, ...standardQueryOptions, staleTime: 5 * 60_000 }),
  events: () => queryOptions({ queryKey: studentQueryKeys.events, queryFn: fetchStudentEvents, ...standardQueryOptions }),
  event: (eventId: string) => queryOptions({ queryKey: studentQueryKeys.event(eventId), queryFn: () => fetchStudentEvent(eventId), enabled: Boolean(eventId), ...standardQueryOptions }),
  attendance: () => queryOptions({ queryKey: studentQueryKeys.attendance, queryFn: fetchStudentAttendance, ...standardQueryOptions }),
  attendanceDetail: (attendanceId: string) => queryOptions({ queryKey: studentQueryKeys.attendanceDetail(attendanceId), queryFn: () => fetchStudentAttendanceDetail(attendanceId), enabled: Boolean(attendanceId), ...standardQueryOptions }),
  announcements: () => queryOptions({ queryKey: studentQueryKeys.announcements, queryFn: fetchStudentAnnouncements, ...standardQueryOptions }),
  notifications: () => queryOptions({ queryKey: studentQueryKeys.notifications, queryFn: fetchStudentNotifications, ...standardQueryOptions })
};

export function useStudentProfile() {
  return useQuery(studentQueryOptions.profile());
}

export function useStudentEvents() {
  return useQuery(studentQueryOptions.events());
}

export function useStudentEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    ...studentQueryOptions.event(eventId),
    initialData: () => queryClient.getQueryData<Event[]>(studentQueryKeys.events)?.find((event) => event.id === eventId),
    initialDataUpdatedAt: () => queryClient.getQueryState(studentQueryKeys.events)?.dataUpdatedAt
  });
}

export function useStudentAttendance() {
  return useQuery(studentQueryOptions.attendance());
}

export function useStudentAttendanceDetail(attendanceId: string) {
  const queryClient = useQueryClient();
  return useQuery({
    ...studentQueryOptions.attendanceDetail(attendanceId),
    initialData: () => queryClient.getQueryData<StudentAttendanceRecord[]>(studentQueryKeys.attendance)?.find((record) => record.id === attendanceId),
    initialDataUpdatedAt: () => queryClient.getQueryState(studentQueryKeys.attendance)?.dataUpdatedAt
  });
}

export function useStudentAnnouncements() {
  return useQuery(studentQueryOptions.announcements());
}

export function useStudentNotifications() {
  return useQuery(studentQueryOptions.notifications());
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
