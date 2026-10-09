import type {
  Announcement,
  AttendanceSession,
  EventLocation,
  EventRequirement,
  EventSchedule,
  EventStatus,
  NotificationRecord,
  StudentProfile
} from "@attendance/types";

export type AcademicCourse = {
  code: string;
  name: string;
};

export type AcademicSection = {
  name: string;
};

export type StudentProfileView = StudentProfile & {
  course: AcademicCourse | null;
  section: AcademicSection | null;
};

export type AttendanceEventSummary = {
  id: string;
  title: string;
  requirement: EventRequirement;
  status: EventStatus;
  schedule: Pick<EventSchedule, "starts_at" | "ends_at"> | null;
  location: Pick<EventLocation, "venue_name"> | null;
};

export type StudentAttendanceRecord = AttendanceSession & {
  event: AttendanceEventSummary | null;
};

export type StudentAnnouncement = Announcement & {
  event: { id: string; title: string } | null;
};

export type StudentNotification = NotificationRecord;
