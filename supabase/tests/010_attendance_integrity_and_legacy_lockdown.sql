-- Rollback-only security regression tests for migration 010.
-- Run after migrations 001-010 in an isolated/local Supabase database.

\set ON_ERROR_STOP on

begin;

create or replace function public._stage2_assert(p_label text, p_condition boolean)
returns void
language plpgsql
as $test$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'Stage 2 assertion failed: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$test$;

create or replace function public._stage2_expect_failure(p_sql text)
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

grant execute on function public._stage2_assert(text, boolean) to anon, authenticated;
grant execute on function public._stage2_expect_failure(text) to anon, authenticated;

-- Local tests grant the same table surface normally supplied by Supabase's API
-- roles so the assertions exercise RLS rather than failing at the table ACL.
grant select, insert, update, delete on public.attendance_sessions to anon, authenticated;
grant select, insert, update, delete on public.attendance_evidence to anon, authenticated;
grant select, insert, update, delete on public.attendance_sync_records to anon, authenticated;
grant select, insert, update, delete on public.attendance_reviews to anon, authenticated;
grant select on public.users, public.student_profiles, public.admin_profiles,
  public.events, public.event_participants to anon, authenticated;

insert into auth.users (id, email) values
  ('81000000-0000-4000-8000-000000000001', 'stage2-student-a@test.invalid'),
  ('81000000-0000-4000-8000-000000000002', 'stage2-student-b@test.invalid'),
  ('81000000-0000-4000-8000-000000000003', 'stage2-admin@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('81000000-0000-4000-8000-000000000001', 'student', 'stage2-student-a@test.invalid', 'Stage 2 Student A', true),
  ('81000000-0000-4000-8000-000000000002', 'student', 'stage2-student-b@test.invalid', 'Stage 2 Student B', true),
  ('81000000-0000-4000-8000-000000000003', 'admin', 'stage2-admin@test.invalid', 'Stage 2 Admin', true);

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active) values
  ('82000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000001', 'STAGE2-A', 'Stage 2 Student A', 'stage2-student-a@test.invalid', true),
  ('82000000-0000-4000-8000-000000000002', '81000000-0000-4000-8000-000000000002', 'STAGE2-B', 'Stage 2 Student B', 'stage2-student-b@test.invalid', true);

insert into public.admin_profiles (id, user_id, full_name, email) values
  ('83000000-0000-4000-8000-000000000001', '81000000-0000-4000-8000-000000000003', 'Stage 2 Admin', 'stage2-admin@test.invalid');

insert into public.events (id, title, description, status, photo_required, time_out_photo_required) values
  ('84000000-0000-4000-8000-000000000001', 'Stage 2 Restricted Event', 'Security fixture.', 'published', false, false),
  ('84000000-0000-4000-8000-000000000002', 'Stage 2 Other Event', 'Security fixture.', 'published', false, false);

insert into public.event_participants (event_id, target_type, student_id)
values ('84000000-0000-4000-8000-000000000001', 'student', '82000000-0000-4000-8000-000000000001');

insert into public.attendance_sessions (
  id,
  local_id,
  event_id,
  student_id,
  status,
  time_in_server_timestamp,
  time_in_verified_timestamp
) values (
  '85000000-0000-4000-8000-000000000001',
  'stage2-session-a',
  '84000000-0000-4000-8000-000000000001',
  '82000000-0000-4000-8000-000000000001',
  'time_in_recorded',
  pg_catalog.now() - interval '30 minutes',
  pg_catalog.now() - interval '30 minutes'
);

insert into public.attendance_sync_records (
  id,
  attendance_session_id,
  local_id,
  idempotency_key,
  student_id,
  event_id,
  submission_mode,
  payload_hash,
  result,
  sync_status
) values (
  '86000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'stage2-local-a',
  'stage2-idempotency-a',
  '82000000-0000-4000-8000-000000000001',
  '84000000-0000-4000-8000-000000000001',
  'time_in',
  repeat('a', 64),
  '{"accepted":true}'::jsonb,
  'pending_verification'
);

insert into public.attendance_evidence (
  id,
  attendance_session_id,
  evidence_type,
  storage_path,
  photo_hash,
  metadata
) values (
  '87000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  'time_in_photo',
  'stage2/exact.jpg',
  'stage2-photo-hash',
  '{"source":"stage2"}'::jsonb
);

insert into public.attendance_reviews (
  id,
  attendance_session_id,
  reviewer_id,
  decision,
  notes
) values (
  '88000000-0000-4000-8000-000000000001',
  '85000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000001',
  'approve',
  'Stage 2 fixture'
);

-- A. Function lockdown and final grants.
select public._stage2_assert('PUBLIC has no legacy attendance RPC grant', not exists (
  select 1
  from pg_catalog.pg_proc function_record
  cross join lateral pg_catalog.aclexplode(function_record.proacl) grant_record
  where function_record.oid = 'public.verify_attendance_submission(uuid,uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)'::pg_catalog.regprocedure
    and grant_record.grantee = 0
    and grant_record.privilege_type = 'EXECUTE'
));
select public._stage2_assert('anonymous cannot execute legacy attendance RPC', not pg_catalog.has_function_privilege(
  'anon',
  'public.verify_attendance_submission(uuid,uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
  'EXECUTE'
));
select public._stage2_assert('authenticated cannot execute legacy attendance RPC', not pg_catalog.has_function_privilege(
  'authenticated',
  'public.verify_attendance_submission(uuid,uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
  'EXECUTE'
));
select public._stage2_assert('authenticated retains submit_attendance_v2 access', pg_catalog.has_function_privilege(
  'authenticated',
  'public.submit_attendance_v2(uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
  'EXECUTE'
));
select public._stage2_assert('anonymous cannot execute assignment helper', not pg_catalog.has_function_privilege(
  'anon', 'public.student_is_assigned_to_event(uuid,uuid)', 'EXECUTE'
));
select public._stage2_assert('authenticated cannot execute assignment helper', not pg_catalog.has_function_privilege(
  'authenticated', 'public.student_is_assigned_to_event(uuid,uuid)', 'EXECUTE'
));
select public._stage2_assert('anonymous cannot execute geofence helper', not pg_catalog.has_function_privilege(
  'anon', 'public.event_point_is_inside_zone(uuid,double precision,double precision)', 'EXECUTE'
));
select public._stage2_assert('authenticated cannot execute geofence helper', not pg_catalog.has_function_privilege(
  'authenticated', 'public.event_point_is_inside_zone(uuid,double precision,double precision)', 'EXECUTE'
));
select public._stage2_assert('anonymous cannot execute QR helper', not pg_catalog.has_function_privilege(
  'anon', 'public.validate_qr_token(uuid,text)', 'EXECUTE'
));
select public._stage2_assert('authenticated cannot execute QR helper', not pg_catalog.has_function_privilege(
  'authenticated', 'public.validate_qr_token(uuid,text)', 'EXECUTE'
));

-- B. Anonymous and student direct-table mutation attempts remain blocked by RLS.
set local role anon;
select pg_catalog.set_config('request.jwt.claim.sub', '', true);
select public._stage2_assert('anonymous legacy helper invocation is denied', public._stage2_expect_failure(
  $sql$select public.student_is_assigned_to_event('82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001')$sql$
));
select public._stage2_assert('anonymous legacy attendance RPC invocation is denied', public._stage2_expect_failure(
  $sql$select public.verify_attendance_submission(null::uuid,null::uuid,null::text,null::timestamptz,null::double precision,null::double precision,null::double precision,null::text,null::text,null::text,null::uuid,null::text,null::text,false)$sql$
));
select public._stage2_assert('anonymous attendance insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_sessions(event_id,student_id) values ('84000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000001')$sql$
));
select public._stage2_assert('anonymous evidence insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_evidence(attendance_session_id,evidence_type) values ('85000000-0000-4000-8000-000000000001','device')$sql$
));
select public._stage2_assert('anonymous sync insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_sync_records(local_id,idempotency_key,student_id,event_id) values ('anon-local','anon-idempotency','82000000-0000-4000-8000-000000000001','84000000-0000-4000-8000-000000000001')$sql$
));
select public._stage2_assert('anonymous review insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_reviews(attendance_session_id,reviewer_id,decision) values ('85000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','approve')$sql$
));
update public.attendance_sessions set status = 'rejected' where id = '85000000-0000-4000-8000-000000000001';
delete from public.attendance_sessions where id = '85000000-0000-4000-8000-000000000001';
update public.attendance_evidence set photo_hash = 'anonymous-change' where id = '87000000-0000-4000-8000-000000000001';
delete from public.attendance_evidence where id = '87000000-0000-4000-8000-000000000001';
update public.attendance_sync_records set retry_count = 99 where id = '86000000-0000-4000-8000-000000000001';
delete from public.attendance_sync_records where id = '86000000-0000-4000-8000-000000000001';
update public.attendance_reviews set notes = 'anonymous-change' where id = '88000000-0000-4000-8000-000000000001';
delete from public.attendance_reviews where id = '88000000-0000-4000-8000-000000000001';
reset role;
select public._stage2_assert('anonymous update/delete attempts have no effects', (
  (select status = 'time_in_recorded' from public.attendance_sessions where id = '85000000-0000-4000-8000-000000000001')
  and (select photo_hash = 'stage2-photo-hash' from public.attendance_evidence where id = '87000000-0000-4000-8000-000000000001')
  and (select retry_count = 0 from public.attendance_sync_records where id = '86000000-0000-4000-8000-000000000001')
  and (select notes = 'Stage 2 fixture' from public.attendance_reviews where id = '88000000-0000-4000-8000-000000000001')
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select public._stage2_assert('student cannot call assignment helper with another student id', public._stage2_expect_failure(
  $sql$select public.student_is_assigned_to_event('82000000-0000-4000-8000-000000000001', '84000000-0000-4000-8000-000000000001')$sql$
));
select public._stage2_assert('auth-bound event helper rejects spoofed restricted access', not public.student_can_access_event(
  '84000000-0000-4000-8000-000000000001'
));
select public._stage2_assert('student legacy attendance RPC invocation is denied', public._stage2_expect_failure(
  $sql$select public.verify_attendance_submission(null::uuid,null::uuid,null::text,null::timestamptz,null::double precision,null::double precision,null::double precision,null::text,null::text,null::text,null::uuid,null::text,null::text,false)$sql$
));
select pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select public._stage2_assert('student attendance insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_sessions(event_id,student_id) values ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000001')$sql$
));
update public.attendance_sessions set status = 'completed'
where id = '85000000-0000-4000-8000-000000000001';
select public._stage2_assert('student attendance update affects no rows', (
  select status = 'time_in_recorded' from public.attendance_sessions where id = '85000000-0000-4000-8000-000000000001'
));
delete from public.attendance_sessions where id = '85000000-0000-4000-8000-000000000001';
select public._stage2_assert('student attendance delete affects no rows', (
  select pg_catalog.count(*) = 1 from public.attendance_sessions where id = '85000000-0000-4000-8000-000000000001'
));
update public.attendance_sync_records set retry_count = 99
where id = '86000000-0000-4000-8000-000000000001';
select public._stage2_assert('student sync update affects no rows', (
  select retry_count = 0 from public.attendance_sync_records where id = '86000000-0000-4000-8000-000000000001'
));
select public._stage2_assert('student evidence insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_evidence(attendance_session_id,evidence_type) values ('85000000-0000-4000-8000-000000000001','device')$sql$
));
select public._stage2_assert('student review insert is denied', public._stage2_expect_failure(
  $sql$insert into public.attendance_reviews(attendance_session_id,reviewer_id,decision) values ('85000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000001','approve')$sql$
));
update public.attendance_evidence set photo_hash = 'student-change' where id = '87000000-0000-4000-8000-000000000001';
delete from public.attendance_evidence where id = '87000000-0000-4000-8000-000000000001';
delete from public.attendance_sync_records where id = '86000000-0000-4000-8000-000000000001';
update public.attendance_reviews set notes = 'student-change' where id = '88000000-0000-4000-8000-000000000001';
delete from public.attendance_reviews where id = '88000000-0000-4000-8000-000000000001';
reset role;
select public._stage2_assert('student update/delete attempts have no effects', (
  (select photo_hash = 'stage2-photo-hash' from public.attendance_evidence where id = '87000000-0000-4000-8000-000000000001')
  and (select pg_catalog.count(*) = 1 from public.attendance_sync_records where id = '86000000-0000-4000-8000-000000000001')
  and (select notes = 'Stage 2 fixture' from public.attendance_reviews where id = '88000000-0000-4000-8000-000000000001')
));

-- C. Admin reads and approved mutation surfaces remain functional.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select public._stage2_assert('admin retains attendance reads', (select pg_catalog.count(*) = 1 from public.attendance_sessions));
select public._stage2_assert('admin retains evidence reads', (select pg_catalog.count(*) = 1 from public.attendance_evidence));
select public._stage2_assert('admin retains sync reads', (select pg_catalog.count(*) = 1 from public.attendance_sync_records));
select public._stage2_assert('admin retains review reads', (select pg_catalog.count(*) = 1 from public.attendance_reviews));
update public.attendance_sessions
set status = 'verified', reviewed_by = '83000000-0000-4000-8000-000000000001', reviewed_at = pg_catalog.now()
where id = '85000000-0000-4000-8000-000000000001';
select public._stage2_assert('admin attendance mutation follows the installed security stage', (
  select case
    when pg_catalog.to_regprocedure('public.review_attendance_v2(uuid,text,text,text)') is null
      then status = 'verified' and reviewed_at is not null
    else status = 'time_in_recorded' and reviewed_at is null
  end
  from public.attendance_sessions
  where id = '85000000-0000-4000-8000-000000000001'
));
update public.attendance_sync_records
set retry_count = retry_count + 1
where id = '86000000-0000-4000-8000-000000000001';
select public._stage2_assert('admin sync mutation follows the installed security stage', (
  select retry_count = case
    when pg_catalog.to_regprocedure('public.review_attendance_v2(uuid,text,text,text)') is null then 1
    else 0
  end
  from public.attendance_sync_records
  where id = '86000000-0000-4000-8000-000000000001'
));
reset role;

-- D. Idempotency identity is immutable even for trusted/admin table writers.
select public._stage2_assert('idempotency owner cannot change', public._stage2_expect_failure(
  $sql$update public.attendance_sync_records set student_id='82000000-0000-4000-8000-000000000002' where id='86000000-0000-4000-8000-000000000001'$sql$
));
select public._stage2_assert('idempotency event cannot change', public._stage2_expect_failure(
  $sql$update public.attendance_sync_records set event_id='84000000-0000-4000-8000-000000000002' where id='86000000-0000-4000-8000-000000000001'$sql$
));
select public._stage2_assert('idempotency mode cannot change', public._stage2_expect_failure(
  $sql$update public.attendance_sync_records set submission_mode='time_out' where id='86000000-0000-4000-8000-000000000001'$sql$
));
select public._stage2_assert('idempotency payload hash cannot change', public._stage2_expect_failure(
  $sql$update public.attendance_sync_records set payload_hash=repeat('b',64) where id='86000000-0000-4000-8000-000000000001'$sql$
));
select public._stage2_assert('idempotency key remains unique', public._stage2_expect_failure(
  $sql$insert into public.attendance_sync_records(local_id,idempotency_key,student_id,event_id) values ('duplicate-local','stage2-idempotency-a','82000000-0000-4000-8000-000000000002','84000000-0000-4000-8000-000000000002')$sql$
));

-- E. Evidence protection blocks only byte-for-byte equivalent side effects.
select public._stage2_assert('exact duplicate evidence is rejected', public._stage2_expect_failure(
  $sql$insert into public.attendance_evidence(attendance_session_id,evidence_type,storage_path,photo_hash,metadata) values ('85000000-0000-4000-8000-000000000001','time_in_photo','stage2/exact.jpg','stage2-photo-hash','{"source":"stage2"}'::jsonb)$sql$
));
insert into public.attendance_evidence (
  attendance_session_id, evidence_type, storage_path, photo_hash, metadata
) values (
  '85000000-0000-4000-8000-000000000001',
  'time_in_photo',
  'stage2/exact.jpg',
  'stage2-photo-hash',
  '{"source":"admin-follow-up"}'::jsonb
);
select public._stage2_assert('same evidence type/path with distinct metadata remains allowed', (
  select pg_catalog.count(*) = 2
  from public.attendance_evidence
  where attendance_session_id = '85000000-0000-4000-8000-000000000001'
));

-- F. Status and trusted server timestamps cannot form impossible new states.
select public._stage2_assert('completed session without time-in is rejected', public._stage2_expect_failure(
  $sql$insert into public.attendance_sessions(event_id,student_id,status,time_out_server_timestamp,time_out_verified_timestamp) values ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','completed',now(),now())$sql$
));
select public._stage2_assert('time-out before time-in is rejected', public._stage2_expect_failure(
  $sql$insert into public.attendance_sessions(event_id,student_id,status,time_in_server_timestamp,time_in_verified_timestamp,time_out_server_timestamp,time_out_verified_timestamp) values ('84000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000002','completed',now(),now(),now()-interval '1 minute',now())$sql$
));
insert into public.attendance_sessions (
  event_id,
  student_id,
  status,
  time_in_server_timestamp,
  time_out_server_timestamp,
  time_out_verified_timestamp,
  reviewed_at
) values (
  '84000000-0000-4000-8000-000000000002',
  '82000000-0000-4000-8000-000000000002',
  'completed',
  pg_catalog.now() - interval '1 hour',
  pg_catalog.now(),
  pg_catalog.now(),
  pg_catalog.now() - interval '30 minutes'
);
select public._stage2_assert('admin-reviewed legacy time-in can complete', (
  select pg_catalog.count(*) = 1
  from public.attendance_sessions
  where event_id = '84000000-0000-4000-8000-000000000002'
    and student_id = '82000000-0000-4000-8000-000000000002'
    and status = 'completed'
));

rollback;
