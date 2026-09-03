# Setup

## Prerequisites

- Node.js 20+
- npm 10+
- Expo CLI through `npx expo`
- Supabase CLI
- A Supabase project or local Supabase stack

## Install

```bash
npm install
```

## Environment

Copy `.env.example` into the app-specific env files:

```bash
cp .env.example .env
cp .env.example apps/mobile/.env
cp .env.example apps/admin-web/.env.local
```

Set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_ACCESS_TOKEN` when push delivery is enabled

Never place `SUPABASE_SERVICE_ROLE_KEY` in the mobile or web client env files.

## Database

For local Supabase:

```bash
supabase start
supabase db reset
```

For a remote project:

```bash
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy submit-attendance
supabase functions deploy review-attendance
supabase functions deploy generate-qr
supabase functions deploy send-notification
supabase functions deploy verify-student-registration
supabase functions deploy resolve-student-login
```

Seed sample data:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed/seed.sql
```

## Run Mobile

```bash
npm run dev:mobile
```

Use Expo Go for simple testing or a development build when testing camera, maps, notifications, and native configuration.

## Run Admin

```bash
npm run dev:admin
```

Open `http://localhost:3000`.

## Auth Accounts

Admins still create their own Supabase Auth users and matching rows in:

- `public.users`
- `public.admin_profiles` for admins

Students register from the mobile app. Before registration, import the approved CSU Gonzaga CBEA roster from the admin `/students` page or directly into `public.approved_student_roster`.

Required roster CSV columns:

- `student_id`
- `school_email`
- `full_name`

Optional columns:

- `year_level`
- `status`

Student registration is activated only when:

- the submitted student ID matches `approved_student_roster.student_id`
- the submitted school email matches `approved_student_roster.school_email`
- the roster row is CBEA and `eligible`
- the Supabase school email confirmation is completed
- the roster row is not already claimed by another auth user

Student ID login is resolved by the `resolve-student-login` Edge Function. The mobile app no longer maps IDs to fake `@students.local` emails.
