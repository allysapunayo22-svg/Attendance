-- Migration 010: Remove ordinary-client access to legacy attendance helpers
-- and protect the integrity of records created by submit_attendance_v2.

-- The Phase 2A visibility policies installed by migration 008 no longer use
-- student_is_assigned_to_event. Keep the legacy helpers temporarily for
-- rollback/forensics and trusted-owner use, but make them unavailable through
-- PostgREST to anonymous and authenticated clients.

alter function public.verify_attendance_submission(
  uuid,
  uuid,
  text,
  timestamptz,
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  uuid,
  text,
  text,
  boolean
) owner to postgres;
alter function public.verify_attendance_submission(
  uuid,
  uuid,
  text,
  timestamptz,
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  uuid,
  text,
  text,
  boolean
) set search_path = pg_catalog, public;
revoke all on function public.verify_attendance_submission(
  uuid,
  uuid,
  text,
  timestamptz,
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  uuid,
  text,
  text,
  boolean
) from public, anon, authenticated;

alter function public.student_is_assigned_to_event(uuid, uuid) owner to postgres;
alter function public.student_is_assigned_to_event(uuid, uuid)
  set search_path = pg_catalog, public;
revoke all on function public.student_is_assigned_to_event(uuid, uuid)
  from public, anon, authenticated;

alter function public.event_point_is_inside_zone(uuid, double precision, double precision)
  owner to postgres;
alter function public.event_point_is_inside_zone(uuid, double precision, double precision)
  set search_path = pg_catalog, public;
revoke all on function public.event_point_is_inside_zone(uuid, double precision, double precision)
  from public, anon, authenticated;

alter function public.validate_qr_token(uuid, text) owner to postgres;
alter function public.validate_qr_token(uuid, text)
  set search_path = pg_catalog, public;
revoke all on function public.validate_qr_token(uuid, text)
  from public, anon, authenticated;

-- These authorization helpers are evaluated by RLS policies. They must remain
-- callable by PostgREST roles, but their SECURITY DEFINER environment should be
-- deterministic and their grants should be explicit rather than inherited from
-- the default PUBLIC function privilege.

alter function public.current_user_role() owner to postgres;
alter function public.current_user_role() set search_path = pg_catalog, public;
revoke all on function public.current_user_role() from public, anon, authenticated;
grant execute on function public.current_user_role() to anon, authenticated;

alter function public.is_admin() owner to postgres;
alter function public.is_admin() set search_path = pg_catalog, public;
revoke all on function public.is_admin() from public, anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

alter function public.current_student_profile_id() owner to postgres;
alter function public.current_student_profile_id() set search_path = pg_catalog, public;
revoke all on function public.current_student_profile_id() from public, anon, authenticated;
grant execute on function public.current_student_profile_id() to anon, authenticated;

alter function public.current_admin_profile_id() owner to postgres;
alter function public.current_admin_profile_id() set search_path = pg_catalog, public;
revoke all on function public.current_admin_profile_id() from public, anon, authenticated;
grant execute on function public.current_admin_profile_id() to anon, authenticated;

-- A unique idempotency_key already guarantees one row per key. Prevent a later
-- update from rebinding that row to a different owner, event, mode, or payload.

create or replace function public.protect_attendance_sync_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.idempotency_key is distinct from old.idempotency_key
    or new.student_id is distinct from old.student_id
    or new.event_id is distinct from old.event_id
    or new.submission_mode is distinct from old.submission_mode
    or new.payload_hash is distinct from old.payload_hash then
    raise exception using
      errcode = '23514',
      message = 'Attendance idempotency identity fields are immutable.';
  end if;

  return new;
end;
$$;

alter function public.protect_attendance_sync_identity() owner to postgres;
revoke all on function public.protect_attendance_sync_identity()
  from public, anon, authenticated;

drop trigger if exists attendance_sync_identity_is_immutable
  on public.attendance_sync_records;
create trigger attendance_sync_identity_is_immutable
before update on public.attendance_sync_records
for each row execute function public.protect_attendance_sync_identity();

-- Protect against a future exact duplicate evidence side effect without
-- imposing broad uniqueness on evidence type or storage path. Existing rows
-- are left untouched, and evidence with different metadata remains allowed.

create or replace function public.prevent_exact_attendance_evidence_duplicate()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.attendance_session_id::text || ':' || new.evidence_type || ':' ||
      coalesce(new.storage_path, '') || ':' ||
      coalesce(new.photo_hash, '') || ':' || new.metadata::text,
      10
    )
  );

  if exists (
    select 1
    from public.attendance_evidence evidence
    where evidence.attendance_session_id = new.attendance_session_id
      and evidence.evidence_type = new.evidence_type
      and evidence.storage_path is not distinct from new.storage_path
      and evidence.photo_hash is not distinct from new.photo_hash
      and evidence.metadata = new.metadata
  ) then
    raise exception using
      errcode = '23505',
      message = 'An identical attendance evidence record already exists.';
  end if;

  return new;
end;
$$;

alter function public.prevent_exact_attendance_evidence_duplicate() owner to postgres;
revoke all on function public.prevent_exact_attendance_evidence_duplicate()
  from public, anon, authenticated;

drop trigger if exists attendance_evidence_prevent_exact_duplicate
  on public.attendance_evidence;
create trigger attendance_evidence_prevent_exact_duplicate
before insert on public.attendance_evidence
for each row execute function public.prevent_exact_attendance_evidence_duplicate();

-- These constraints encode only states already required by the v2 state
-- machine. NOT VALID keeps unknown legacy rows deployable while enforcing the
-- rules for every new or changed row. An administrator-reviewed legacy time-in
-- may have reviewed_at instead of time_in_verified_timestamp.

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'attendance_sessions_server_timestamp_order_check'
      and conrelid = 'public.attendance_sessions'::pg_catalog.regclass
  ) then
    alter table public.attendance_sessions
      add constraint attendance_sessions_server_timestamp_order_check
      check (
        time_out_server_timestamp is null
        or (
          time_in_server_timestamp is not null
          and time_out_server_timestamp >= time_in_server_timestamp
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'attendance_sessions_completed_timestamps_check'
      and conrelid = 'public.attendance_sessions'::pg_catalog.regclass
  ) then
    alter table public.attendance_sessions
      add constraint attendance_sessions_completed_timestamps_check
      check (
        status <> 'completed'::public.attendance_status
        or (
          time_in_server_timestamp is not null
          and (
            time_in_verified_timestamp is not null
            or reviewed_at is not null
          )
          and time_out_server_timestamp is not null
          and time_out_verified_timestamp is not null
        )
      ) not valid;
  end if;
end
$$;

comment on function public.protect_attendance_sync_identity() is
  'Prevents an idempotency record from being rebound to another attendance submission.';

comment on function public.prevent_exact_attendance_evidence_duplicate() is
  'Prevents concurrent creation of field-for-field equivalent attendance evidence rows.';
