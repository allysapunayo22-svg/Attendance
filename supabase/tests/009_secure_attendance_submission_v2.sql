-- Rollback-only security regression tests for migration 009.
-- Run after migrations 001-009 in an isolated/local Supabase database.

begin;

create or replace function pg_temp.assert_true(value boolean, message text)
returns void
language plpgsql
as $$
begin
  if not coalesce(value, false) then
    raise exception 'ASSERTION FAILED: %', message;
  end if;
end;
$$;

create or replace function pg_temp.submit_attendance(
  event_id uuid,
  attendance_mode text,
  device_id uuid,
  local_id text,
  idempotency_key text,
  device_timestamp timestamptz default pg_catalog.now(),
  latitude double precision default 0,
  longitude double precision default 0,
  accuracy_meters double precision default 5,
  photo_storage_path text default null,
  qr_token text default null,
  offline_submission boolean default false
)
returns jsonb
language sql
as $$
  select public.submit_attendance_v2(
    p_event_id => event_id,
    p_mode => attendance_mode,
    p_device_timestamp => device_timestamp,
    p_latitude => latitude,
    p_longitude => longitude,
    p_accuracy_meters => accuracy_meters,
    p_photo_storage_path => photo_storage_path,
    p_photo_hash => case when photo_storage_path is null then null else 'test-photo-hash-' || local_id end,
    p_qr_token => qr_token,
    p_device_id => device_id,
    p_local_id => local_id,
    p_idempotency_key => idempotency_key,
    p_is_offline_submission => offline_submission
  )
$$;

select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.submit_attendance_v2(uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  ),
  'anonymous role must not be able to invoke submit_attendance_v2'
);

select pg_temp.assert_true(
  pg_catalog.has_function_privilege(
    'authenticated',
    'public.submit_attendance_v2(uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  ),
  'authenticated role must be able to invoke submit_attendance_v2'
);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'assigned-v2@test.local'),
  ('10000000-0000-4000-8000-000000000002', 'unassigned-v2@test.local'),
  ('10000000-0000-4000-8000-000000000003', 'inactive-user-v2@test.local'),
  ('10000000-0000-4000-8000-000000000004', 'inactive-profile-v2@test.local');

insert into public.users (id, role, email, full_name, is_active) values
  ('10000000-0000-4000-8000-000000000001', 'student', 'assigned-v2@test.local', 'Assigned V2', true),
  ('10000000-0000-4000-8000-000000000002', 'student', 'unassigned-v2@test.local', 'Unassigned V2', true),
  ('10000000-0000-4000-8000-000000000003', 'student', 'inactive-user-v2@test.local', 'Inactive User V2', false),
  ('10000000-0000-4000-8000-000000000004', 'student', 'inactive-profile-v2@test.local', 'Inactive Profile V2', true);

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'V2-A', 'Assigned V2', 'assigned-v2@test.local', true),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'V2-B', 'Unassigned V2', 'unassigned-v2@test.local', true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'V2-C', 'Inactive User V2', 'inactive-user-v2@test.local', true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'V2-D', 'Inactive Profile V2', 'inactive-profile-v2@test.local', false);

insert into public.devices (id, student_id, device_fingerprint, platform, is_active) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'v2-device-a', 'test', true),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'v2-device-b', 'test', true),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', 'v2-device-c', 'test', true),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', 'v2-device-d', 'test', true);

insert into public.events (
  id,
  title,
  description,
  status,
  photo_required,
  time_out_photo_required,
  dynamic_qr_required,
  minimum_attendance_minutes
)
select
  ('60000000-0000-4000-8000-' || pg_catalog.lpad(number::text, 12, '0'))::uuid,
  'V2 Test Event ' || number,
  'Rollback-only secure attendance test event ' || number,
  'published'::public.event_status,
  false,
  false,
  false,
  0
from pg_catalog.generate_series(1, 30) as number;

update public.events
set status = 'draft'
where id = '60000000-0000-4000-8000-000000000003';

update public.events
set deleted_at = pg_catalog.now()
where id = '60000000-0000-4000-8000-000000000004';

update public.events
set photo_required = true
where id = '60000000-0000-4000-8000-000000000008';

update public.events
set dynamic_qr_required = true
where id = '60000000-0000-4000-8000-000000000009';

insert into public.event_schedules (
  event_id,
  event_date,
  starts_at,
  ends_at,
  check_in_opens_at,
  check_in_closes_at,
  late_ends_at,
  check_out_opens_at,
  check_out_closes_at
)
select
  id,
  current_date,
  pg_catalog.now() - interval '1 hour',
  pg_catalog.now() + interval '2 hours',
  pg_catalog.now() - interval '1 hour',
  pg_catalog.now() + interval '1 hour',
  pg_catalog.now() + interval '1 hour',
  pg_catalog.now() - interval '1 hour',
  pg_catalog.now() + interval '1 hour'
from public.events
where id::text like '60000000-0000-4000-8000-%';

update public.event_schedules
set
  check_in_opens_at = pg_catalog.now() - interval '3 hours',
  check_in_closes_at = pg_catalog.now() - interval '2 hours',
  late_ends_at = pg_catalog.now() - interval '2 hours'
where event_id = '60000000-0000-4000-8000-000000000022';

insert into public.event_locations (
  event_id,
  venue_name,
  latitude,
  longitude,
  radius_meters,
  required_gps_accuracy_meters
)
select id, 'V2 Test Venue', 0, 0, 100, 50
from public.events
where id::text like '60000000-0000-4000-8000-%';

insert into public.event_participants (event_id, target_type, student_id)
values (
  '60000000-0000-4000-8000-000000000001',
  'student',
  '20000000-0000-4000-8000-000000000001'
);

insert into storage.objects (bucket_id, name, metadata) values
  (
    'attendance-evidence',
    '10000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000008/local-photo-valid.jpg',
    '{"mimetype":"image/jpeg","size":1024}'::jsonb
  );

insert into public.event_qr_tokens (event_id, token_hash, expires_at) values
  (
    '60000000-0000-4000-8000-000000000009',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to('valid-v2-token', 'UTF8'), 'sha256'), 'hex'),
    pg_catalog.now() + interval '30 minutes'
  ),
  (
    '60000000-0000-4000-8000-000000000009',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to('expired-v2-token', 'UTF8'), 'sha256'), 'hex'),
    pg_catalog.now() - interval '1 second'
  );

-- A legacy/manual-review record approved by an administrator is a verified
-- time-in even when the older flow did not populate time_in_verified_timestamp.
insert into public.attendance_sessions (
  id,
  local_id,
  event_id,
  student_id,
  status,
  time_in_device_timestamp,
  time_in_server_timestamp,
  reviewed_at,
  device_id
) values (
  '70000000-0000-4000-8000-000000000021',
  'local-admin-verified-in',
  '60000000-0000-4000-8000-000000000021',
  '20000000-0000-4000-8000-000000000001',
  'verified',
  pg_catalog.now() - interval '10 minutes',
  pg_catalog.now() - interval '10 minutes',
  pg_catalog.now() - interval '5 minutes',
  '30000000-0000-4000-8000-000000000001'
);

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert_true(
  not (public.submit_attendance_v2(
    '60000000-0000-4000-8000-000000000002', 'time_in', pg_catalog.now(), 0, 0, 5,
    null, null, null, '30000000-0000-4000-8000-000000000001',
    'local-no-auth', 'idempotency-no-auth', false
  ) ->> 'accepted')::boolean,
  'authenticated role without auth.uid must be rejected'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000001', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-assigned-a', 'idempotency-assigned-a'
  ) ->> 'accepted')::boolean,
  'active assigned student must be accepted'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000002', 'local-unrestricted-b', 'idempotency-unrestricted-b'
  ) ->> 'accepted')::boolean,
  'active student must be accepted for an unrestricted event'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000001', 'time_in',
    '30000000-0000-4000-8000-000000000002', 'local-unassigned-b', 'idempotency-unassigned-b'
  ) ->> 'accepted')::boolean,
  'unassigned student must be rejected for a restricted event'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000003', 'local-inactive-user', 'idempotency-inactive-user'
  ) ->> 'accepted')::boolean,
  'inactive user account must be rejected'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000004', 'local-inactive-profile', 'idempotency-inactive-profile'
  ) ->> 'accepted')::boolean,
  'inactive student profile must be rejected'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-wrong-device', 'idempotency-wrong-device'
  ) ->> 'accepted')::boolean,
  'student B must not use student A device or identity context'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000003', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-draft-event', 'idempotency-draft-event'
  ) ->> 'accepted')::boolean,
  'draft event must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000004', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-deleted-event', 'idempotency-deleted-event'
  ) ->> 'accepted')::boolean,
  'deleted event must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'invalid_mode',
    '30000000-0000-4000-8000-000000000001', 'local-invalid-mode', 'idempotency-invalid-mode'
  ) ->> 'accepted')::boolean,
  'invalid mode must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000022', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-closed-window', 'idempotency-closed-window'
  ) ->> 'accepted')::boolean,
  'fresh device evidence must still be rejected outside the server attendance window'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000001', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-duplicate-in', 'idempotency-duplicate-in'
  ) ->> 'accepted')::boolean,
  'duplicate accepted time-in must be rejected'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000001', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-assigned-a', 'idempotency-assigned-a'
  ) ->> 'accepted')::boolean,
  'exact idempotent replay must return the original accepted result'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000001', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-assigned-a', 'idempotency-assigned-a',
    pg_catalog.now(), 0.00001, 0, 5
  ) ->> 'accepted')::boolean,
  'changed payload must be rejected when reusing an idempotency key'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000005', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-no-time-in', 'idempotency-no-time-in'
  ) ->> 'accepted')::boolean,
  'checkout without accepted time-in must be rejected cleanly'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000006', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-rejected-in', 'idempotency-rejected-in',
    pg_catalog.now(), 1, 1, 5
  ) ->> 'accepted')::boolean,
  'outside-zone time-in must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000006', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-after-rejected', 'idempotency-after-rejected'
  ) ->> 'accepted')::boolean,
  'rejected time-in must not authorize checkout'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000007', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-repeat-in', 'idempotency-repeat-in'
  ) ->> 'accepted')::boolean,
  'time-in for repeated-checkout test must be accepted'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000007', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-repeat-out', 'idempotency-repeat-out'
  ) ->> 'accepted')::boolean,
  'first checkout must be accepted'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000007', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-repeat-out', 'idempotency-repeat-out'
  ) ->> 'accepted')::boolean,
  'exact checkout replay must return its original accepted result'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000007', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-repeat-out-2', 'idempotency-repeat-out-2'
  ) ->> 'accepted')::boolean,
  'new repeated checkout must be rejected'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000021', 'time_out',
    '30000000-0000-4000-8000-000000000001', 'local-admin-verified-out', 'idempotency-admin-verified-out'
  ) ->> 'accepted')::boolean,
  'administrator-verified legacy time-in must authorize checkout'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-null-accuracy', 'idempotency-null-accuracy',
    pg_catalog.now(), 0, 0, null
  ) ->> 'accepted')::boolean,
  'null GPS accuracy must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000002', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-negative-accuracy', 'idempotency-negative-accuracy',
    pg_catalog.now(), 0, 0, -1
  ) ->> 'accepted')::boolean,
  'negative GPS accuracy must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000008', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-photo-fake', 'idempotency-photo-fake',
    pg_catalog.now(), 0, 0, 5, 'not-a-valid-evidence-path.jpg'
  ) ->> 'accepted')::boolean,
  'fake photo path must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000008', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-photo-missing', 'idempotency-photo-missing',
    pg_catalog.now(), 0, 0, 5,
    '10000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000008/local-photo-missing.jpg'
  ) ->> 'accepted')::boolean,
  'missing private storage object must be rejected'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000008', 'time_in',
    '30000000-0000-4000-8000-000000000002', 'local-photo-valid', 'idempotency-photo-prefix',
    pg_catalog.now(), 0, 0, 5,
    '10000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000008/local-photo-valid.jpg'
  ) ->> 'accepted')::boolean,
  'another user storage prefix must be rejected'
);

select pg_catalog.set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000008', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-photo-valid', 'idempotency-photo-valid',
    pg_catalog.now(), 0, 0, 5,
    '10000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000008/local-photo-valid.jpg'
  ) ->> 'accepted')::boolean,
  'valid private photo evidence must be accepted'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000008', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-photo-valid', 'idempotency-photo-valid',
    pg_catalog.now(), 0, 0, 5,
    '10000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000008/local-photo-valid.jpg'
  ) ->> 'accepted')::boolean,
  'photo submission replay must return its original result'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000009', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-qr-invalid', 'idempotency-qr-invalid',
    pg_catalog.now(), 0, 0, 5, null, 'invalid-v2-token'
  ) ->> 'accepted')::boolean,
  'invalid required QR must be rejected'
);

select pg_temp.assert_true(
  not (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000009', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-qr-expired', 'idempotency-qr-expired',
    pg_catalog.now(), 0, 0, 5, null, 'expired-v2-token'
  ) ->> 'accepted')::boolean,
  'expired required QR must be rejected'
);

select pg_temp.assert_true(
  (pg_temp.submit_attendance(
    '60000000-0000-4000-8000-000000000009', 'time_in',
    '30000000-0000-4000-8000-000000000001', 'local-qr-valid', 'idempotency-qr-valid',
    pg_catalog.now(), 0, 0, 5, null, 'valid-v2-token'
  ) ->> 'accepted')::boolean,
  'valid QR must be accepted only after other authorization checks pass'
);

-- Freshness boundaries. Each accepted boundary uses a separate event so state
-- constraints do not affect the timestamp result.
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000010', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-now-on', 'idempotency-fresh-now-on', pg_catalog.now(), 0, 0, 5, null, null, false) ->> 'accepted')::boolean, 'exactly now online must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000011', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-now-off', 'idempotency-fresh-now-off', pg_catalog.now(), 0, 0, 5, null, null, true) ->> 'accepted')::boolean, 'exactly now offline must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000012', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-30m-on', 'idempotency-fresh-30m-on', pg_catalog.now() - interval '30 minutes', 0, 0, 5, null, null, false) ->> 'accepted')::boolean, '30 minutes old online must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000013', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-30m-off', 'idempotency-fresh-30m-off', pg_catalog.now() - interval '30 minutes', 0, 0, 5, null, null, true) ->> 'accepted')::boolean, '30 minutes old offline must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000014', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-2h-on', 'idempotency-fresh-2h-on', pg_catalog.now() - interval '2 hours', 0, 0, 5, null, null, false) ->> 'accepted')::boolean, 'exactly two hours old online must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000015', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-2h-off', 'idempotency-fresh-2h-off', pg_catalog.now() - interval '2 hours', 0, 0, 5, null, null, true) ->> 'accepted')::boolean, 'exactly two hours old offline must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000016', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-5m-on', 'idempotency-fresh-5m-on', pg_catalog.now() + interval '5 minutes', 0, 0, 5, null, null, false) ->> 'accepted')::boolean, 'exactly five minutes future online must be fresh');
select pg_temp.assert_true((pg_temp.submit_attendance('60000000-0000-4000-8000-000000000017', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-fresh-5m-off', 'idempotency-fresh-5m-off', pg_catalog.now() + interval '5 minutes', 0, 0, 5, null, null, true) ->> 'accepted')::boolean, 'exactly five minutes future offline must be fresh');

select pg_temp.assert_true(not (pg_temp.submit_attendance('60000000-0000-4000-8000-000000000018', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-stale-on', 'idempotency-stale-on', pg_catalog.now() - interval '2 hours 1 second', 0, 0, 5, null, null, false) ->> 'accepted')::boolean, 'two hours and one second old online must be rejected');
select pg_temp.assert_true(not (pg_temp.submit_attendance('60000000-0000-4000-8000-000000000018', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-stale-off', 'idempotency-stale-off', pg_catalog.now() - interval '2 hours 1 second', 0, 0, 5, null, null, true) ->> 'accepted')::boolean, 'two hours and one second old offline must be rejected');
select pg_temp.assert_true(not (pg_temp.submit_attendance('60000000-0000-4000-8000-000000000019', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-future-on', 'idempotency-future-on', pg_catalog.now() + interval '5 minutes 1 second', 0, 0, 5, null, null, false) ->> 'accepted')::boolean, 'five minutes and one second future online must be rejected');
select pg_temp.assert_true(not (pg_temp.submit_attendance('60000000-0000-4000-8000-000000000019', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-future-off', 'idempotency-future-off', pg_catalog.now() + interval '5 minutes 1 second', 0, 0, 5, null, null, true) ->> 'accepted')::boolean, 'five minutes and one second future offline must be rejected');
select pg_temp.assert_true(not (pg_temp.submit_attendance('60000000-0000-4000-8000-000000000020', 'time_in', '30000000-0000-4000-8000-000000000001', 'local-null-time', 'idempotency-null-time', null) ->> 'accepted')::boolean, 'null timestamp must be rejected cleanly');

reset role;

select pg_temp.assert_true(
  (select pg_catalog.count(*) from public.attendance_sessions where event_id = '60000000-0000-4000-8000-000000000001') = 1,
  'duplicate and replayed time-in must leave one canonical session'
);

select pg_temp.assert_true(
  not exists (
    select 1 from public.attendance_sessions
    where event_id = '60000000-0000-4000-8000-000000000006'
  ),
  'rejected time-in and checkout must not create a canonical session'
);

select pg_temp.assert_true(
  (select pg_catalog.count(*) from public.attendance_sync_records where idempotency_key = 'idempotency-assigned-a') = 1,
  'exact idempotent replay must leave one sync record'
);

select pg_temp.assert_true(
  (
    select payload_hash is not null
      and pg_catalog.length(payload_hash) = 64
      and payload_hash ~ '^[0-9a-f]{64}$'
    from public.attendance_sync_records
    where idempotency_key = 'idempotency-assigned-a'
  ),
  'accepted submission must retain a SHA-256 payload hash for idempotency'
);

select pg_temp.assert_true(
  (select pg_catalog.count(*) from public.attendance_evidence where storage_path like '%/local-photo-valid.jpg') = 1,
  'exact photo replay must not insert duplicate evidence'
);

select pg_temp.assert_true(
  (select pg_catalog.count(*) from public.attendance_sessions where event_id = '60000000-0000-4000-8000-000000000007' and status = 'completed') = 1,
  'repeated checkout must leave one completed canonical session'
);

select 'migration 009 rollback-only security tests passed' as result;

rollback;
