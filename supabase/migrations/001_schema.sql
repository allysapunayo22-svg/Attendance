create extension if not exists "pgcrypto";
create extension if not exists "postgis";

create type public.user_role as enum ('student', 'admin', 'super_admin');
create type public.event_status as enum ('draft', 'published', 'ongoing', 'completed', 'cancelled');
create type public.event_requirement as enum ('required', 'optional');
create type public.zone_type as enum ('circle', 'polygon');
create type public.attendance_status as enum (
  'not_started',
  'eligible_to_check_in',
  'outside_attendance_area',
  'gps_accuracy_too_low',
  'time_in_recorded',
  'pending_upload',
  'pending_verification',
  'verified',
  'late',
  'time_out_required',
  'completed',
  'rejected',
  'excused',
  'missed'
);
create type public.sync_status as enum (
  'draft',
  'pending_upload',
  'uploading',
  'uploaded',
  'pending_verification',
  'verified',
  'failed',
  'requires_review'
);
create type public.appeal_status as enum (
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'more_information_required'
);
create type public.request_type as enum ('absence', 'late', 'correction');
create type public.announcement_importance as enum ('normal', 'important', 'urgent');
create type public.notification_type as enum (
  'event_reminder',
  'schedule_change',
  'event_cancelled',
  'check_in_open',
  'check_out_reminder',
  'attendance_verified',
  'attendance_rejected',
  'appeal_decision'
);

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  email text not null unique,
  full_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  year_level int not null check (year_level between 1 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, name, year_level)
);

create table public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  student_id text not null unique,
  full_name text not null,
  email text not null unique,
  course_id uuid references public.courses(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  year_level int check (year_level between 1 and 6),
  profile_photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  permissions text[] not null default array['events:manage', 'attendance:review'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  year_level int not null check (year_level between 1 and 6),
  school_year text not null,
  semester text not null,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  unique (student_id, school_year, semester)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  banner_path text,
  type text not null default 'school_event',
  requirement public.event_requirement not null default 'required',
  status public.event_status not null default 'draft',
  photo_required boolean not null default true,
  time_out_photo_required boolean not null default true,
  dynamic_qr_required boolean not null default false,
  early_time_out_allowed boolean not null default false,
  minimum_attendance_minutes int not null default 0 check (minimum_attendance_minutes >= 0),
  max_participants int check (max_participants is null or max_participants > 0),
  registration_deadline timestamptz,
  notification_schedule jsonb not null default '[]'::jsonb,
  photo_retention_days int not null default 180,
  created_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  deleted_at timestamptz
);

create table public.event_schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  event_date date not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check_in_opens_at timestamptz not null,
  check_in_closes_at timestamptz not null,
  late_ends_at timestamptz,
  check_out_opens_at timestamptz,
  check_out_closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (check_in_opens_at <= check_in_closes_at),
  check (check_out_opens_at is null or check_out_closes_at is null or check_out_opens_at <= check_out_closes_at)
);

create table public.event_locations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete cascade,
  venue_name text not null,
  address text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geog geography(point, 4326) generated always as (
    st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
  ) stored,
  radius_meters int not null default 100 check (radius_meters between 10 and 1000),
  required_gps_accuracy_meters int not null default 50 check (required_gps_accuracy_meters between 5 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_zones (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  zone_type public.zone_type not null,
  center_latitude double precision check (center_latitude is null or center_latitude between -90 and 90),
  center_longitude double precision check (center_longitude is null or center_longitude between -180 and 180),
  radius_meters int check (radius_meters is null or radius_meters between 10 and 1000),
  polygon geometry(polygon, 4326),
  geojson jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (zone_type = 'circle' and center_latitude is not null and center_longitude is not null and radius_meters is not null)
    or
    (zone_type = 'polygon' and polygon is not null)
  )
);

create table public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  target_type text not null check (target_type in ('course', 'section', 'year_level', 'student')),
  course_id uuid references public.courses(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  student_id uuid references public.student_profiles(id) on delete cascade,
  year_level int check (year_level is null or year_level between 1 and 6),
  created_at timestamptz not null default now()
);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  registered_at timestamptz not null default now(),
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'waitlisted')),
  unique (event_id, student_id)
);

create table public.event_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  local_id text,
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  status public.attendance_status not null default 'pending_verification',
  time_in_device_timestamp timestamptz,
  time_in_server_timestamp timestamptz,
  time_in_verified_timestamp timestamptz,
  time_in_latitude double precision check (time_in_latitude is null or time_in_latitude between -90 and 90),
  time_in_longitude double precision check (time_in_longitude is null or time_in_longitude between -180 and 180),
  time_in_geog geography(point, 4326) generated always as (
    case
      when time_in_longitude is null or time_in_latitude is null then null
      else st_setsrid(st_makepoint(time_in_longitude, time_in_latitude), 4326)::geography
    end
  ) stored,
  time_in_accuracy double precision,
  time_in_distance double precision,
  time_in_photo_path text,
  time_in_qr_token text,
  time_out_device_timestamp timestamptz,
  time_out_server_timestamp timestamptz,
  time_out_verified_timestamp timestamptz,
  time_out_latitude double precision check (time_out_latitude is null or time_out_latitude between -90 and 90),
  time_out_longitude double precision check (time_out_longitude is null or time_out_longitude between -180 and 180),
  time_out_geog geography(point, 4326) generated always as (
    case
      when time_out_longitude is null or time_out_latitude is null then null
      else st_setsrid(st_makepoint(time_out_longitude, time_out_latitude), 4326)::geography
    end
  ) stored,
  time_out_accuracy double precision,
  time_out_distance double precision,
  time_out_photo_path text,
  time_out_qr_token text,
  attendance_duration_minutes int,
  verification_reason text,
  suspicious_flags text[] not null default '{}',
  device_id uuid,
  is_offline_submission boolean not null default false,
  sync_status public.sync_status not null default 'pending_verification',
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, student_id),
  unique (student_id, local_id)
);

create table public.attendance_evidence (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('time_in_photo', 'time_out_photo', 'qr_scan', 'device', 'location')),
  storage_path text,
  metadata jsonb not null default '{}'::jsonb,
  photo_hash text,
  created_at timestamptz not null default now()
);

create table public.attendance_sync_records (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid references public.attendance_sessions(id) on delete cascade,
  local_id text not null,
  idempotency_key text not null unique,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  sync_status public.sync_status not null default 'pending_upload',
  retry_count int not null default 0,
  last_error text,
  submitted_at timestamptz not null default now(),
  uploaded_at timestamptz,
  verified_at timestamptz
);

create table public.attendance_reviews (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  reviewer_id uuid not null references public.admin_profiles(id) on delete restrict,
  decision text not null check (decision in ('approve', 'reject', 'late', 'excuse')),
  notes text,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create table public.absence_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  request_type public.request_type not null,
  explanation text not null,
  document_paths text[] not null default '{}',
  status public.appeal_status not null default 'submitted',
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, event_id, request_type)
);

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  explanation text not null,
  document_paths text[] not null default '{}',
  status public.appeal_status not null default 'submitted',
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  importance public.announcement_importance not null default 'normal',
  event_id uuid references public.events(id) on delete set null,
  attachment_paths text[] not null default '{}',
  scheduled_at timestamptz,
  publish_at timestamptz not null default now(),
  created_by uuid references public.admin_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  target_type text not null check (target_type in ('all', 'course', 'section', 'year_level', 'student')),
  course_id uuid references public.courses(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  student_id uuid references public.student_profiles(id) on delete cascade,
  year_level int check (year_level is null or year_level between 1 and 6),
  created_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  device_fingerprint text not null,
  platform text not null,
  device_name text,
  app_version text,
  push_token text,
  is_active boolean not null default true,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz,
  unique (student_id, device_fingerprint)
);

alter table public.attendance_sessions
  add constraint attendance_sessions_device_fk foreign key (device_id) references public.devices(id) on delete set null;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  provider text not null check (provider in ('expo', 'fcm')),
  platform text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_events_status_date on public.events(status, created_at desc) where deleted_at is null;
create index idx_event_schedules_windows on public.event_schedules(check_in_opens_at, check_in_closes_at, check_out_opens_at, check_out_closes_at);
create index idx_event_locations_geog on public.event_locations using gist (geog);
create index idx_event_zones_polygon on public.event_zones using gist (polygon);
create index idx_event_participants_event on public.event_participants(event_id);
create index idx_event_participants_student on public.event_participants(student_id);
create index idx_event_registrations_student_event on public.event_registrations(student_id, event_id);
create index idx_event_qr_tokens_event_expires on public.event_qr_tokens(event_id, expires_at);
create index idx_attendance_event_status on public.attendance_sessions(event_id, status);
create index idx_attendance_student_created on public.attendance_sessions(student_id, created_at desc);
create index idx_attendance_time_in_geog on public.attendance_sessions using gist (time_in_geog);
create index idx_attendance_sync_status on public.attendance_sync_records(sync_status, submitted_at);
create index idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
create unique index idx_devices_one_active_per_student on public.devices(student_id) where is_active;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger departments_set_updated_at before update on public.departments for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses for each row execute function public.set_updated_at();
create trigger sections_set_updated_at before update on public.sections for each row execute function public.set_updated_at();
create trigger student_profiles_set_updated_at before update on public.student_profiles for each row execute function public.set_updated_at();
create trigger admin_profiles_set_updated_at before update on public.admin_profiles for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
create trigger event_schedules_set_updated_at before update on public.event_schedules for each row execute function public.set_updated_at();
create trigger event_locations_set_updated_at before update on public.event_locations for each row execute function public.set_updated_at();
create trigger event_zones_set_updated_at before update on public.event_zones for each row execute function public.set_updated_at();
create trigger attendance_sessions_set_updated_at before update on public.attendance_sessions for each row execute function public.set_updated_at();
create trigger absence_requests_set_updated_at before update on public.absence_requests for each row execute function public.set_updated_at();
create trigger appeals_set_updated_at before update on public.appeals for each row execute function public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements for each row execute function public.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('attendance-evidence', 'attendance-evidence', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('event-banners', 'event-banners', true, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('appeal-documents', 'appeal-documents', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;
