"use client";

import { fetchAssignedEvent, fetchAssignedEvents } from "@attendance/api-client";
import type { Event } from "@attendance/types";
import { supabase } from "@/lib/supabase";
import {
  cacheAttendanceForOwner,
  cacheEventForOwner,
  cacheEventsForOwner,
  getCachedAttendanceForOwner,
  getCachedEventForOwner,
  getCachedEventsForOwner
} from "./offline/db";
import { localSessionOwnerId } from "./offline/session";
import type {
  AttendanceEventSummary,
  StudentAnnouncement,
  StudentAttendanceRecord,
  StudentNotification,
  StudentProfileView
} from "./types";

function firstOrValue<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function offlineCacheAllowed(error: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? "");
  return error instanceof TypeError || /failed to fetch|network|load failed|offline|temporar/i.test(message);
}

async function ownerIsUnchanged(ownerId: string | null) {
  return Boolean(ownerId) && await localSessionOwnerId() === ownerId;
}

export async function fetchStudentEvents(): Promise<Event[]> {
  const ownerId = await localSessionOwnerId();
  try {
    const events = await fetchAssignedEvents(supabase);
    if (ownerId && !await ownerIsUnchanged(ownerId)) throw new Error("The signed-in account changed while events were loading.");
    if (ownerId) await cacheEventsForOwner(ownerId, events);
    return events;
  } catch (error) {
    if (ownerId && offlineCacheAllowed(error) && await ownerIsUnchanged(ownerId)) {
      const cached = await getCachedEventsForOwner(ownerId);
      if (cached.length) return cached;
    }
    throw error;
  }
}

export async function fetchStudentEvent(eventId: string): Promise<Event | null> {
  const ownerId = await localSessionOwnerId();
  try {
    const event = await fetchAssignedEvent(supabase, eventId);
    if (ownerId && !await ownerIsUnchanged(ownerId)) throw new Error("The signed-in account changed while the event was loading.");
    if (ownerId && event) await cacheEventForOwner(ownerId, event);
    return event;
  } catch (error) {
    if (ownerId && offlineCacheAllowed(error) && await ownerIsUnchanged(ownerId)) {
      const cached = await getCachedEventForOwner(ownerId, eventId);
      if (cached) return cached;
    }
    throw error;
  }
}

export async function fetchStudentProfile(): Promise<StudentProfileView | null> {
  const { data, error } = await supabase
    .from("student_profiles")
    .select("id,user_id,student_id,full_name,email,course_id,section_id,year_level,profile_photo_path,is_active,course:courses(code,name),section:sections(name)")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    course: firstOrValue(data.course),
    section: firstOrValue(data.section)
  } as StudentProfileView;
}

function normalizeAttendanceRow(row: Record<string, unknown>): StudentAttendanceRecord {
  const rawEvent = firstOrValue(row.event as AttendanceEventSummary | AttendanceEventSummary[] | null);
  const event = rawEvent
    ? {
        ...rawEvent,
        schedule: firstOrValue(rawEvent.schedule),
        location: firstOrValue(rawEvent.location)
      }
    : null;

  return { ...row, event } as StudentAttendanceRecord;
}

const attendanceSelect = `
  *,
  event:events(
    id,
    title,
    requirement,
    status,
    schedule:event_schedules(starts_at,ends_at),
    location:event_locations(venue_name)
  )
`;

export async function fetchStudentAttendance(): Promise<StudentAttendanceRecord[]> {
  const ownerId = await localSessionOwnerId();
  try {
    const { data, error } = await supabase
      .from("attendance_sessions")
      .select(attendanceSelect)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const attendance = (data ?? []).map((row) => normalizeAttendanceRow(row as Record<string, unknown>));
    if (ownerId && !await ownerIsUnchanged(ownerId)) throw new Error("The signed-in account changed while attendance was loading.");
    if (ownerId) await cacheAttendanceForOwner(ownerId, attendance);
    return attendance;
  } catch (error) {
    if (ownerId && offlineCacheAllowed(error) && await ownerIsUnchanged(ownerId)) {
      const cached = await getCachedAttendanceForOwner(ownerId);
      if (cached.length) return cached;
    }
    throw error;
  }
}

export async function fetchStudentAttendanceDetail(attendanceId: string): Promise<StudentAttendanceRecord | null> {
  const { data, error } = await supabase
    .from("attendance_sessions")
    .select(attendanceSelect)
    .eq("id", attendanceId)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeAttendanceRow(data as Record<string, unknown>) : null;
}

export async function fetchStudentAnnouncements(): Promise<StudentAnnouncement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,description,importance,event_id,attachment_paths,publish_at,created_at,event:events(id,title)")
    .order("publish_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, event: firstOrValue(row.event) })) as StudentAnnouncement[];
}

export async function fetchStudentNotifications(): Promise<StudentNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,type,title,body,read_at,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as StudentNotification[];
}

export async function markStudentNotificationRead(notificationId: string, readAt = new Date().toISOString()) {
  const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notificationId);
  if (error) throw error;
  return readAt;
}

export async function markStudentNotificationsRead(notificationIds: string[], readAt = new Date().toISOString()) {
  if (!notificationIds.length) return readAt;
  const { error } = await supabase.from("notifications").update({ read_at: readAt }).in("id", notificationIds);
  if (error) throw error;
  return readAt;
}
