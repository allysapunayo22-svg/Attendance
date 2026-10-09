export const studentQueryKeys = {
  profile: ["student", "profile"] as const,
  events: ["student", "events"] as const,
  event: (eventId: string) => ["student", "events", eventId] as const,
  attendance: ["student", "attendance"] as const,
  attendanceDetail: (attendanceId: string) => ["student", "attendance", attendanceId] as const,
  announcements: ["student", "announcements"] as const,
  notifications: ["student", "notifications"] as const
};
