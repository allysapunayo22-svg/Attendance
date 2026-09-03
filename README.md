# Attendance System

Location-based student attendance tracking system with:

- Expo React Native student mobile app
- Next.js admin dashboard
- Supabase PostgreSQL, Auth, Storage, Realtime, Edge Functions, RLS, and PostGIS
- Offline-first SQLite attendance queue
- Server-side attendance verification

## Project Structure

```text
attendance-system/
apps/
  mobile/            Expo Router student app
  admin-web/         Next.js App Router admin dashboard
packages/
  types/             Shared TypeScript domain types
  validation/        Zod schemas for forms and payloads
  api-client/        Supabase API helpers
  shared-utils/      Geo, time, and id utilities
supabase/
  migrations/        PostgreSQL schema, RLS, verification functions
  functions/         Edge Functions for attendance, QR, review, notifications
  seed/              Sample departments, courses, sections, event, announcement
docs/                Setup, architecture, testing, deployment, security notes
```

## Core Workflows

- Students authenticate, load cached events immediately, and refresh from Supabase in the background.
- Attendance actions request fresh high-accuracy GPS only when needed.
- Check-in/check-out captures live camera evidence, optional dynamic QR, GPS accuracy, and location.
- Mobile writes attendance locally first, then uploads photo evidence and invokes server verification.
- Supabase PostGIS validates radius/polygon location, schedules, GPS accuracy, QR validity, device registration, duplicates, and offline delay signals.
- Admins manage events, zones, live attendance, reviews, students, announcements, reports, QR codes, and audit logs.

## Quick Start

See [docs/setup.md](docs/setup.md).

## Security Model

Clients use only the Supabase anon key. Privileged operations run through Edge Functions with authenticated callers and service-role access inside Supabase only. Final attendance status is never trusted from the mobile device.
