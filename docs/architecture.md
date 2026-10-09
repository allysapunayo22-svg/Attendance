# Architecture

## Mobile App

The Expo app uses Expo Router route groups:

- `(auth)/login.tsx` and `(auth)/register.tsx` for roster-verified student authentication
- `(student)` bottom tabs for Home, Events, Attendance, Notifications, Profile
- `event/[id]` for event details and map preview
- `check-in/[eventId]` and `check-out/[eventId]` for live evidence capture
- `appeal` for absence and correction requests
- `privacy` for the student privacy notice

State and persistence:

- Zustand stores the authenticated student and registered device id.
- TanStack Query coordinates cached reads and server refreshes.
- Expo SQLite stores profile-adjacent cached data, events, announcements, attendance history, and pending sync records.
- Expo SecureStore stores Supabase auth tokens through the Supabase client storage adapter.

## Unified Web Application

The Next.js app uses App Router with server-protected role areas:

- `/` authenticated role resolver
- `/login` shared administrator and student authentication
- `/admin` role-protected administration dashboard
- `/admin/events` event management table
- `/admin/events/new` event creation form with Leaflet zone picker
- `/admin/live-attendance` realtime monitoring and dynamic QR generation
- `/admin/review-queue` attendance review queue
- `/admin/students` account and device management
- `/admin/announcements` announcement publishing
- `/admin/reports` CSV, Excel, and PDF export
- `/student` student home with assigned events, attendance summaries, and notices
- `/student/events` and `/student/events/[id]` RLS-scoped event discovery and details
- `/student/attendance` and `/student/attendance/[id]` server-backed attendance history
- `/student/announcements` targeted and global student announcements
- `/student/notifications` server-backed in-app notification inbox
- `/student/profile` roster-protected student profile information

The student web area has its own mobile-first shell and does not reuse the admin dashboard shell. All student reads use the authenticated Supabase session and database RLS; browser-local mobile attendance records are not used as web history. Browser attendance capture, offline synchronization, PWA installation, and Web Push remain outside Phase 2A.

## Supabase

PostgreSQL tables are normalized around users, student/admin profiles, events, schedules, locations, zones, assignments, attendance sessions, evidence, reviews, devices, notifications, and audit logs.

PostGIS is used for:

- circular radius validation with `ST_DWithin`
- polygon zone validation with `ST_Contains`
- distance calculation with `ST_Distance`

Edge Functions:

- `submit-attendance`: authenticates a student, validates device registration, then calls the verification RPC.
- `review-attendance`: requires admin role and records decisions/audit logs.
- `generate-qr`: requires admin role, stores a hashed expiring QR token, and returns the token to render.
- `send-notification`: inserts notification rows and sends Expo push notifications when tokens exist.
- `verify-student-registration`: checks that student ID and school email match the approved CSU Gonzaga CBEA roster before mobile sign-up.
- `resolve-student-login`: resolves a student ID to the registered school email so students can log in with either ID or email.
