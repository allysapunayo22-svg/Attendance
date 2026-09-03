export type UserRole = "student" | "admin" | "super_admin";

export type EventStatus = "draft" | "published" | "ongoing" | "completed" | "cancelled";

export type EventRequirement = "required" | "optional";

export type AttendanceStatus =
  | "not_started"
  | "eligible_to_check_in"
  | "outside_attendance_area"
  | "gps_accuracy_too_low"
  | "time_in_recorded"
  | "pending_upload"
  | "pending_verification"
  | "verified"
  | "late"
  | "time_out_required"
  | "completed"
  | "rejected"
  | "excused"
  | "missed";

export type LocalSyncStatus =
  | "draft"
  | "pending_upload"
  | "uploading"
  | "uploaded"
  | "pending_verification"
  | "verified"
  | "failed"
  | "requires_review";

export type AppealStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "more_information_required";

export type NotificationType =
  | "event_reminder"
  | "schedule_change"
  | "event_cancelled"
  | "check_in_open"
  | "check_out_reminder"
  | "attendance_verified"
  | "attendance_rejected"
  | "appeal_decision";

export type SuspiciousFlag =
  | "mock_location_possible"
  | "gps_accuracy_low"
  | "outside_zone"
  | "duplicate_submission"
  | "qr_invalid"
  | "qr_expired"
  | "device_mismatch"
  | "same_device_multiple_accounts"
  | "impossible_travel"
  | "offline_delay_exceeded"
  | "duplicate_photo"
  | "rooted_or_modified_device_warning";

export interface StudentProfile {
  id: string;
  user_id: string;
  student_id: string;
  full_name: string;
  email: string;
  course_id: string | null;
  section_id: string | null;
  year_level: number | null;
  profile_photo_path: string | null;
  is_active: boolean;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  permissions: string[];
}

export interface EventSchedule {
  id: string;
  event_id: string;
  event_date: string;
  starts_at: string;
  ends_at: string;
  check_in_opens_at: string;
  check_in_closes_at: string;
  late_ends_at: string | null;
  check_out_opens_at: string | null;
  check_out_closes_at: string | null;
}

export interface EventLocation {
  id: string;
  event_id: string;
  venue_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  required_gps_accuracy_meters: number;
}

export interface EventZone {
  id: string;
  event_id: string;
  name: string;
  zone_type: "circle" | "polygon";
  radius_meters: number | null;
  coordinates: Array<{ latitude: number; longitude: number }>;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  banner_path: string | null;
  type: string;
  requirement: EventRequirement;
  status: EventStatus;
  photo_required: boolean;
  time_out_photo_required: boolean;
  dynamic_qr_required: boolean;
  early_time_out_allowed?: boolean;
  minimum_attendance_minutes: number;
  max_participants: number | null;
  registration_deadline: string | null;
  photo_retention_days?: number;
  created_at: string;
  updated_at: string;
  schedule?: EventSchedule | null;
  location?: EventLocation | null;
  zones?: EventZone[];
  attendance_status?: AttendanceStatus;
  distance_meters?: number | null;
}

export interface AttendanceSession {
  id: string;
  local_id: string | null;
  event_id: string;
  student_id: string;
  status: AttendanceStatus;
  time_in_device_timestamp: string | null;
  time_in_server_timestamp: string | null;
  time_in_verified_timestamp: string | null;
  time_in_latitude: number | null;
  time_in_longitude: number | null;
  time_in_accuracy: number | null;
  time_in_distance: number | null;
  time_in_photo_path: string | null;
  time_in_qr_token: string | null;
  time_out_device_timestamp: string | null;
  time_out_server_timestamp: string | null;
  time_out_verified_timestamp: string | null;
  time_out_latitude: number | null;
  time_out_longitude: number | null;
  time_out_accuracy: number | null;
  time_out_distance: number | null;
  time_out_photo_path: string | null;
  time_out_qr_token: string | null;
  attendance_duration_minutes: number | null;
  verification_reason: string | null;
  suspicious_flags: SuspiciousFlag[];
  device_id: string | null;
  is_offline_submission: boolean;
  sync_status: LocalSyncStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  description: string;
  importance: "normal" | "important" | "urgent";
  event_id: string | null;
  attachment_paths: string[];
  publish_at: string;
  created_at: string;
}

export interface AttendanceSubmission {
  local_id: string;
  event_id: string;
  mode: "time_in" | "time_out";
  device_timestamp: string;
  latitude: number;
  longitude: number;
  accuracy_meters: number;
  photo_local_uri?: string | undefined;
  photo_storage_path?: string | undefined;
  photo_hash?: string | undefined;
  qr_token?: string | undefined;
  device_id: string;
  idempotency_key: string;
  is_offline_submission: boolean;
}

export interface VerificationResult {
  accepted: boolean;
  status: AttendanceStatus;
  distance_meters: number | null;
  verification_reason: string;
  suspicious_flags: SuspiciousFlag[];
}

export interface AbsenceRequest {
  id: string;
  student_id: string;
  event_id: string;
  explanation: string;
  request_type: "absence" | "late" | "correction";
  document_paths: string[];
  status: AppealStatus;
  created_at: string;
  updated_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  read_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
