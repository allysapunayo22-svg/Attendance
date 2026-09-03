# Database And Security

## Important Tables

The schema includes all requested tables:

- `users`
- `student_profiles`
- `admin_profiles`
- `departments`
- `courses`
- `sections`
- `enrollments`
- `events`
- `event_schedules`
- `event_locations`
- `event_zones`
- `event_participants`
- `event_registrations`
- `event_qr_tokens`
- `attendance_sessions`
- `attendance_evidence`
- `attendance_sync_records`
- `attendance_reviews`
- `absence_requests`
- `appeals`
- `announcements`
- `announcement_recipients`
- `devices`
- `push_tokens`
- `notifications`
- `audit_logs`

## RLS Summary

Students can:

- read their own profile
- read assigned published events
- read assigned event schedules, locations, and zones
- read their own attendance and evidence
- manage their own devices
- create their own registrations, absence requests, appeals, push tokens
- read their own notifications

Admins can:

- manage events, schedules, locations, zones, participants, registrations
- manage attendance, evidence, reviews, students, announcements, devices, notifications
- view audit logs

Students do not directly write final attendance rows. The mobile app invokes the `submit-attendance` Edge Function, which verifies auth/device and calls the PostGIS verification RPC.

## Attendance Verification

The RPC stores:

- device captured time
- server received time
- server verified time

It checks:

- student event assignment
- event schedule and check-in/check-out windows
- latitude/longitude validity
- GPS accuracy
- circle or polygon zone inclusion
- distance from event
- duplicate attendance
- QR token hash and expiry
- registered device
- required photo evidence
- minimum duration for time-out

Suspicious signals are stored in `suspicious_flags` for administrator review. The system avoids automatic permanent rejection based only on warnings such as mock-location or device anomalies.
