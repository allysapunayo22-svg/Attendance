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

## Admin Dashboard

The Next.js app uses App Router route groups:

- `/` dashboard overview
- `/events` event management table
- `/events/new` event creation form with Leaflet zone picker
- `/attendance/live` realtime monitoring and dynamic QR generation
- `/attendance/review` attendance review queue
- `/students` account and device management
- `/announcements` announcement publishing
- `/reports` CSV, Excel, and PDF export

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
