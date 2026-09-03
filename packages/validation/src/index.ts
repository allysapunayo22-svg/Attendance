import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(3, "Enter your student ID or email."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const registerSchema = z
  .object({
    studentId: z
      .string()
      .trim()
      .min(4, "Enter your CSU student ID.")
      .max(32, "Student ID is too long.")
      .regex(/^[A-Za-z0-9-]+$/, "Use only letters, numbers, and hyphens."),
    fullName: z.string().trim().min(3, "Enter your full name.").max(120),
    schoolEmail: z.string().trim().email("Enter your CSU school email.").max(160),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
    acceptPrivacy: z.boolean().refine((value) => value, "You must accept the privacy notice.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match."
  });

export const eventFormSchema = z
  .object({
    title: z.string().min(3),
    description: z.string().min(10),
    type: z.string().min(1),
    requirement: z.enum(["required", "optional"]),
    eventDate: z.string().min(1),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    checkInOpensAt: z.string().min(1),
    checkInClosesAt: z.string().min(1),
    lateEndsAt: z.string().optional().nullable(),
    checkOutOpensAt: z.string().optional().nullable(),
    checkOutClosesAt: z.string().optional().nullable(),
    venueName: z.string().min(2),
    address: z.string().optional().nullable(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radiusMeters: z.coerce.number().min(10).max(1000),
    requiredGpsAccuracyMeters: z.coerce.number().min(5).max(200),
    zoneMode: z.enum(["circle", "polygon", "multiple"]),
    zones: z
      .array(
        z.object({
          name: z.string().min(1),
          zoneType: z.enum(["circle", "polygon"]),
          radiusMeters: z.coerce.number().min(10).max(1000).optional().nullable(),
          coordinates: z
            .array(
              z.object({
                latitude: z.coerce.number().min(-90).max(90),
                longitude: z.coerce.number().min(-180).max(180)
              })
            )
            .min(1)
        })
      )
      .default([]),
    photoRequired: z.boolean().default(true),
    timeOutPhotoRequired: z.boolean().default(true),
    dynamicQrRequired: z.boolean().default(false),
    minimumAttendanceMinutes: z.coerce.number().min(0).max(1440),
    assignedCourseIds: z.array(z.string().uuid()).default([]),
    assignedSectionIds: z.array(z.string().uuid()).default([]),
    assignedYearLevels: z.array(z.coerce.number().int().min(1).max(4)).default([]),
    maxParticipants: z.coerce.number().int().positive().optional().nullable(),
    registrationDeadline: z.string().optional().nullable(),
    notificationSchedule: z.array(z.string()).default([])
  })
  .refine((data) => data.checkInOpensAt <= data.checkInClosesAt, {
    path: ["checkInClosesAt"],
    message: "Check-in closing time must be after opening time."
  })
  .refine((data) => !data.lateEndsAt || data.lateEndsAt >= data.checkInClosesAt, {
    path: ["lateEndsAt"],
    message: "Late period ending time must be after check-in closing time."
  })
  .refine((data) => data.startsAt < data.endsAt, {
    path: ["endsAt"],
    message: "Event end time must be after start time."
  });

export const attendanceSubmissionSchema = z.object({
  local_id: z.string().min(8),
  event_id: z.string().uuid(),
  mode: z.enum(["time_in", "time_out"]),
  device_timestamp: z.string().datetime(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy_meters: z.number().min(0).max(1000),
  photo_storage_path: z.string().optional(),
  photo_hash: z.string().optional(),
  qr_token: z.string().optional(),
  device_id: z.string().min(8),
  idempotency_key: z.string().min(12),
  is_offline_submission: z.boolean()
});

export const reviewAttendanceSchema = z.object({
  attendanceId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "late", "excuse"]),
  notes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(1000).optional()
});

export const absenceRequestSchema = z.object({
  eventId: z.string().uuid(),
  requestType: z.enum(["absence", "late", "correction"]),
  explanation: z.string().min(20).max(2000),
  documentPaths: z.array(z.string()).default([])
});

export const appealSchema = z.object({
  attendanceSessionId: z.string().uuid(),
  explanation: z.string().min(20).max(2000),
  documentPaths: z.array(z.string()).default([])
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type EventFormInput = z.infer<typeof eventFormSchema>;
export type AttendanceSubmissionInput = z.infer<typeof attendanceSubmissionSchema>;
export type ReviewAttendanceInput = z.infer<typeof reviewAttendanceSchema>;
export type AbsenceRequestInput = z.infer<typeof absenceRequestSchema>;
export type AppealInput = z.infer<typeof appealSchema>;
