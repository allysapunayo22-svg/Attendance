-- Rollback-only security and behavior tests for migration 013.
-- Run after migrations 001-013 in an isolated/local Supabase database.

\set ON_ERROR_STOP on

begin;

create or replace function public._stage4_assert(p_label text, p_condition boolean)
returns void
language plpgsql
as $test$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'Stage 4 assertion failed: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$test$;

create or replace function public._stage4_expect_failure(p_sql text)
returns boolean
language plpgsql
as $test$
begin
  execute p_sql;
  return false;
exception
  when others then
    return true;
end;
$test$;

grant execute on function public._stage4_assert(text, boolean) to anon, authenticated;
grant execute on function public._stage4_expect_failure(text) to anon, authenticated;

select public._stage4_assert('register RPC owner is postgres', (
  select pg_catalog.pg_get_userbyid(proc.proowner) = 'postgres'
  from pg_catalog.pg_proc proc
  join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'register_student_device_v1'
    and pg_catalog.pg_get_function_identity_arguments(proc.oid) = 'p_fingerprint_hash text, p_browser_label text'
));

select public._stage4_assert('register RPC is SECURITY DEFINER with hardened search_path', (
  select proc.prosecdef
    and proc.proconfig = array['search_path=pg_catalog, public']
  from pg_catalog.pg_proc proc
  join pg_catalog.pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'register_student_device_v1'
    and pg_catalog.pg_get_function_identity_arguments(proc.oid) = 'p_fingerprint_hash text, p_browser_label text'
));

select public._stage4_assert('anonymous registration is denied', not pg_catalog.has_function_privilege(
  'anon', 'public.register_student_device_v1(text,text)', 'EXECUTE'
));
select public._stage4_assert('PUBLIC registration is denied', not exists (
  select 1
  from pg_catalog.pg_proc proc
  cross join lateral pg_catalog.aclexplode(
    coalesce(proc.proacl, pg_catalog.acldefault('f', proc.proowner))
  ) privilege
  where proc.oid = 'public.register_student_device_v1(text,text)'::pg_catalog.regprocedure
    and privilege.grantee = 0
    and privilege.privilege_type = 'EXECUTE'
));
select public._stage4_assert('authenticated registration is granted', pg_catalog.has_function_privilege(
  'authenticated', 'public.register_student_device_v1(text,text)', 'EXECUTE'
));
select public._stage4_assert('no arbitrary metadata overload exists', pg_catalog.to_regprocedure(
  'public.register_student_device_v1(text,text,jsonb)'
) is null);
select public._stage4_assert('registration serializes on the student profile row', pg_catalog.pg_get_functiondef(
  'public.register_student_device_v1(text,text)'::pg_catalog.regprocedure
) ilike '%for update of student_profile%');

insert into auth.users (id, email) values
  ('a1000000-0000-4000-8000-000000000001', 'stage4-student-a@test.invalid'),
  ('a1000000-0000-4000-8000-000000000002', 'stage4-student-b@test.invalid'),
  ('a1000000-0000-4000-8000-000000000003', 'stage4-inactive-user@test.invalid'),
  ('a1000000-0000-4000-8000-000000000004', 'stage4-inactive-profile@test.invalid'),
  ('a1000000-0000-4000-8000-000000000005', 'stage4-admin@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('a1000000-0000-4000-8000-000000000001', 'student', 'stage4-student-a@test.invalid', 'Stage 4 Student A', true),
  ('a1000000-0000-4000-8000-000000000002', 'student', 'stage4-student-b@test.invalid', 'Stage 4 Student B', true),
  ('a1000000-0000-4000-8000-000000000003', 'student', 'stage4-inactive-user@test.invalid', 'Stage 4 Inactive User', false),
  ('a1000000-0000-4000-8000-000000000004', 'student', 'stage4-inactive-profile@test.invalid', 'Stage 4 Inactive Profile', true),
  ('a1000000-0000-4000-8000-000000000005', 'admin', 'stage4-admin@test.invalid', 'Stage 4 Admin', true);

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active) values
  ('a2000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'STAGE4-A', 'Stage 4 Student A', 'stage4-student-a@test.invalid', true),
  ('a2000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'STAGE4-B', 'Stage 4 Student B', 'stage4-student-b@test.invalid', true),
  ('a2000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'STAGE4-C', 'Stage 4 Inactive User', 'stage4-inactive-user@test.invalid', true),
  ('a2000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000004', 'STAGE4-D', 'Stage 4 Inactive Profile', 'stage4-inactive-profile@test.invalid', false);

insert into public.admin_profiles (id, user_id, full_name, email) values
  ('a3000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000005', 'Stage 4 Admin', 'stage4-admin@test.invalid');

insert into public.devices (id, student_id, device_fingerprint, platform, device_name, is_active) values
  ('a4000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'legacy-phone-a', 'ios', 'Phone A', true),
  ('a4000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002', repeat('e', 64), 'web', 'Student B Browser', true);

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000003', true);
select public._stage4_assert('inactive user is denied', public._stage4_expect_failure(
  format('select public.register_student_device_v1(%L,%L)', repeat('c', 64), 'Web Browser')
));

select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000004', true);
select public._stage4_assert('inactive student profile is denied', public._stage4_expect_failure(
  format('select public.register_student_device_v1(%L,%L)', repeat('d', 64), 'Web Browser')
));

select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000005', true);
select public._stage4_assert('admin cannot use student registration RPC', public._stage4_expect_failure(
  format('select public.register_student_device_v1(%L,%L)', repeat('f', 64), 'Web Browser')
));

select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public._stage4_assert('invalid fingerprint is rejected', public._stage4_expect_failure(
  $sql$select public.register_student_device_v1('not-a-hash','Web Browser')$sql$
));
select public._stage4_assert('oversized label is rejected', public._stage4_expect_failure(
  format('select public.register_student_device_v1(%L,%L)', repeat('a', 64), repeat('x', 81))
));
select public._stage4_assert('first browser registration succeeds', (
  public.register_student_device_v1(repeat('a', 64), 'Web Browser A') ->> 'status'
) = 'active');
reset role;

select public._stage4_assert('previous phone is deactivated', not (
  select is_active from public.devices where id = 'a4000000-0000-4000-8000-000000000001'
));
select public._stage4_assert('browser A is the sole active Student A device', (
  select pg_catalog.count(*) = 1
    and pg_catalog.bool_and(device_fingerprint = repeat('a', 64))
  from public.devices
  where student_id = 'a2000000-0000-4000-8000-000000000001'
    and is_active
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public._stage4_assert('matching browser re-registration succeeds', (
  public.register_student_device_v1(repeat('a', 64), 'Web Browser A') ->> 'status'
) = 'active');
reset role;
select public._stage4_assert('matching re-registration does not duplicate devices', (
  select pg_catalog.count(*) = 1
  from public.devices
  where student_id = 'a2000000-0000-4000-8000-000000000001'
    and device_fingerprint = repeat('a', 64)
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public.register_student_device_v1(repeat('b', 64), 'Web Browser B');
select public._stage4_assert('stale browser A resolves inactive', (
  public.resolve_student_device_v1(repeat('a', 64)) ->> 'status'
) = 'inactive');
select public._stage4_assert('browser B resolves active', (
  public.resolve_student_device_v1(repeat('b', 64)) ->> 'status'
) = 'active');
reset role;

select public._stage4_assert('browser B is the sole active Student A device', (
  select pg_catalog.count(*) = 1
    and pg_catalog.bool_and(device_fingerprint = repeat('b', 64))
  from public.devices
  where student_id = 'a2000000-0000-4000-8000-000000000001'
    and is_active
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public.register_student_device_v1(repeat('e', 64), 'Student A Same Hash');
reset role;
select public._stage4_assert('Student A cannot change Student B device', (
  select is_active and device_name = 'Student B Browser'
  from public.devices
  where id = 'a4000000-0000-4000-8000-000000000002'
));
select public._stage4_assert('same hash remains isolated per student', (
  select pg_catalog.count(*) = 2
  from public.devices
  where device_fingerprint = repeat('e', 64)
));

insert into public.events (
  id, title, description, status, photo_required, time_out_photo_required,
  dynamic_qr_required, minimum_attendance_minutes
) values
  ('a5000000-0000-4000-8000-000000000001', 'Stage 4 Active Device', 'Active browser validation.', 'published', false, false, false, 0),
  ('a5000000-0000-4000-8000-000000000002', 'Stage 4 Stale Browser', 'Stale browser validation.', 'published', false, false, false, 0),
  ('a5000000-0000-4000-8000-000000000003', 'Stage 4 Stale Mobile', 'Stale mobile validation.', 'published', false, false, false, 0);

insert into public.event_schedules (
  event_id, event_date, starts_at, ends_at, check_in_opens_at, check_in_closes_at,
  late_ends_at, check_out_opens_at, check_out_closes_at
)
select
  event_record.id,
  current_date,
  pg_catalog.now() - interval '30 minutes',
  pg_catalog.now() + interval '2 hours',
  pg_catalog.now() - interval '30 minutes',
  pg_catalog.now() + interval '1 hour',
  pg_catalog.now() + interval '1 hour',
  pg_catalog.now() - interval '30 minutes',
  pg_catalog.now() + interval '2 hours'
from public.events event_record
where event_record.id in (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003'
);

insert into public.event_locations (
  event_id, venue_name, latitude, longitude, radius_meters, required_gps_accuracy_meters
)
select event_record.id, 'Stage 4 Venue', 0, 0, 100, 50
from public.events event_record
where event_record.id in (
  'a5000000-0000-4000-8000-000000000001',
  'a5000000-0000-4000-8000-000000000002',
  'a5000000-0000-4000-8000-000000000003'
);

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1000000-0000-4000-8000-000000000001', true);
select public._stage4_assert('active browser UUID works with submit_attendance_v2', (
  public.submit_attendance_v2(
    'a5000000-0000-4000-8000-000000000001',
    'time_in',
    pg_catalog.now(),
    0,
    0,
    5,
    null,
    null,
    null,
    (select id from public.devices where student_id = 'a2000000-0000-4000-8000-000000000001' and device_fingerprint = repeat('e', 64)),
    'stage4-active-browser',
    'stage4-active-browser-idempotency',
    false
  ) ->> 'accepted'
)::boolean);
select public._stage4_assert('deactivated browser receives device_mismatch', (
  public.submit_attendance_v2(
    'a5000000-0000-4000-8000-000000000002',
    'time_in',
    pg_catalog.now(),
    0,
    0,
    5,
    null,
    null,
    null,
    (select id from public.devices where student_id = 'a2000000-0000-4000-8000-000000000001' and device_fingerprint = repeat('b', 64)),
    'stage4-stale-browser',
    'stage4-stale-browser-idempotency',
    false
  ) ->> 'verification_reason'
) = 'Device is not active and registered to this student.');
select public._stage4_assert('deactivated phone receives device_mismatch', (
  public.submit_attendance_v2(
    'a5000000-0000-4000-8000-000000000003',
    'time_in',
    pg_catalog.now(),
    0,
    0,
    5,
    null,
    null,
    null,
    'a4000000-0000-4000-8000-000000000001',
    'stage4-stale-phone',
    'stage4-stale-phone-idempotency',
    false
  ) ->> 'verification_reason'
) = 'Device is not active and registered to this student.');
reset role;

select public._stage4_assert('one-active-device uniqueness constraint remains present', exists (
  select 1
  from pg_catalog.pg_indexes
  where schemaname = 'public'
    and indexname = 'idx_devices_one_active_per_student'
    and indexdef ilike '%where is_active%'
));

rollback;
