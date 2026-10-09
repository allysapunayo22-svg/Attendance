-- Rollback-only security regression tests for migration 011.
-- Run after migrations 001-011 in an isolated/local Supabase database.

\set ON_ERROR_STOP on

begin;

create or replace function public._stage3_assert(p_label text, p_condition boolean)
returns void
language plpgsql
as $test$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'Stage 3 assertion failed: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$test$;

create or replace function public._stage3_expect_failure(p_sql text)
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

grant execute on function public._stage3_assert(text, boolean) to anon, authenticated;
grant execute on function public._stage3_expect_failure(text) to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

select public._stage3_assert('storage.objects RLS is enabled', (
  select table_record.relrowsecurity
  from pg_catalog.pg_class table_record
  join pg_catalog.pg_namespace schema_record
    on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'storage'
    and table_record.relname = 'objects'
));

insert into auth.users (id, email) values
  ('91000000-0000-4000-8000-000000000001', 'stage3-admin@test.invalid'),
  ('91000000-0000-4000-8000-000000000002', 'stage3-inactive-admin@test.invalid'),
  ('91000000-0000-4000-8000-000000000003', 'stage3-super@test.invalid'),
  ('91000000-0000-4000-8000-000000000004', 'stage3-inactive-super@test.invalid'),
  ('91000000-0000-4000-8000-000000000005', 'stage3-missing-profile@test.invalid'),
  ('91000000-0000-4000-8000-000000000006', 'stage3-student@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('91000000-0000-4000-8000-000000000001', 'admin', 'stage3-admin@test.invalid', 'Stage 3 Admin', true),
  ('91000000-0000-4000-8000-000000000002', 'admin', 'stage3-inactive-admin@test.invalid', 'Stage 3 Inactive Admin', false),
  ('91000000-0000-4000-8000-000000000003', 'super_admin', 'stage3-super@test.invalid', 'Stage 3 Super Admin', true),
  ('91000000-0000-4000-8000-000000000004', 'super_admin', 'stage3-inactive-super@test.invalid', 'Stage 3 Inactive Super', false),
  ('91000000-0000-4000-8000-000000000005', 'admin', 'stage3-missing-profile@test.invalid', 'Stage 3 Missing Profile', true),
  ('91000000-0000-4000-8000-000000000006', 'student', 'stage3-student@test.invalid', 'Stage 3 Student', true);

insert into public.admin_profiles (id, user_id, full_name, email) values
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'Stage 3 Admin', 'stage3-admin@test.invalid'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'Stage 3 Inactive Admin', 'stage3-inactive-admin@test.invalid'),
  ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000003', 'Stage 3 Super Admin', 'stage3-super@test.invalid'),
  ('92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000004', 'Stage 3 Inactive Super', 'stage3-inactive-super@test.invalid');

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active)
values (
  '93000000-0000-4000-8000-000000000001',
  '91000000-0000-4000-8000-000000000006',
  'STAGE3-001',
  'Stage 3 Student',
  'stage3-student@test.invalid',
  true
);

insert into public.events (
  id, title, description, status, deleted_at, photo_required, time_out_photo_required
) values
  ('94000000-0000-4000-8000-000000000001', 'Stage 3 Published', 'Eligible QR fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000002', 'Stage 3 Ongoing', 'Eligible QR fixture.', 'ongoing', null, false, false),
  ('94000000-0000-4000-8000-000000000003', 'Stage 3 Draft', 'Ineligible QR fixture.', 'draft', null, false, false),
  ('94000000-0000-4000-8000-000000000004', 'Stage 3 Deleted', 'Deleted QR fixture.', 'published', pg_catalog.now(), false, false),
  ('94000000-0000-4000-8000-000000000005', 'Stage 3 Review A', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000006', 'Stage 3 Review B', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000007', 'Stage 3 Review C', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000008', 'Stage 3 Review D', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000009', 'Stage 3 Review E', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000010', 'Stage 3 Review F', 'Review fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000011', 'Stage 3 Atomic Review', 'Review rollback fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000012', 'Stage 3 QR Failure', 'QR rollback fixture.', 'published', null, false, false),
  ('94000000-0000-4000-8000-000000000013', 'Stage 3 QR Canonical', 'QR storage fixture.', 'published', null, false, false);

insert into public.attendance_sessions (
  id, event_id, student_id, status, sync_status, time_in_server_timestamp
) values
  ('95000000-0000-4000-8000-000000000001', '94000000-0000-4000-8000-000000000005', '93000000-0000-4000-8000-000000000001', 'pending_verification', 'requires_review', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000006', '93000000-0000-4000-8000-000000000001', 'rejected', 'requires_review', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000007', '93000000-0000-4000-8000-000000000001', 'pending_verification', 'requires_review', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000004', '94000000-0000-4000-8000-000000000008', '93000000-0000-4000-8000-000000000001', 'pending_verification', 'requires_review', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000005', '94000000-0000-4000-8000-000000000009', '93000000-0000-4000-8000-000000000001', 'pending_verification', 'requires_review', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000006', '94000000-0000-4000-8000-000000000010', '93000000-0000-4000-8000-000000000001', 'time_in_recorded', 'pending_verification', pg_catalog.now() - interval '30 minutes'),
  ('95000000-0000-4000-8000-000000000007', '94000000-0000-4000-8000-000000000011', '93000000-0000-4000-8000-000000000001', 'pending_verification', 'requires_review', pg_catalog.now() - interval '30 minutes');

insert into public.attendance_evidence (
  id, attendance_session_id, evidence_type, storage_path, metadata
) values (
  '96000000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000001',
  'time_in_photo',
  '91000000-0000-4000-8000-000000000006/94000000-0000-4000-8000-000000000005/stage3.jpg',
  '{}'::jsonb
);

insert into storage.objects (bucket_id, name, metadata) values (
  'attendance-evidence',
  '91000000-0000-4000-8000-000000000006/94000000-0000-4000-8000-000000000005/stage3.jpg',
  '{"mimetype":"image/jpeg","size":128}'::jsonb
);

-- A. Function grants and active-admin authorization.
select public._stage3_assert('anonymous cannot execute review RPC', not pg_catalog.has_function_privilege(
  'anon', 'public.review_attendance_v2(uuid,text,text,text)', 'EXECUTE'
));
select public._stage3_assert('authenticated role can reach auth-bound review RPC', pg_catalog.has_function_privilege(
  'authenticated', 'public.review_attendance_v2(uuid,text,text,text)', 'EXECUTE'
));
select public._stage3_assert('anonymous cannot execute QR RPC', not pg_catalog.has_function_privilege(
  'anon', 'public.generate_event_qr_token(uuid,integer)', 'EXECUTE'
));
select public._stage3_assert('authenticated role can reach auth-bound QR RPC', pg_catalog.has_function_privilege(
  'authenticated', 'public.generate_event_qr_token(uuid,integer)', 'EXECUTE'
));
select public._stage3_assert('anonymous cannot execute log_audit', not pg_catalog.has_function_privilege(
  'anon', 'public.log_audit(text,text,uuid,jsonb)', 'EXECUTE'
));
select public._stage3_assert('authenticated cannot execute log_audit', not pg_catalog.has_function_privilege(
  'authenticated', 'public.log_audit(text,text,uuid,jsonb)', 'EXECUTE'
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('active admin authorization succeeds', public.is_active_admin());
select public._stage3_assert('active admin reads private evidence row', (
  select pg_catalog.count(*) = 1 from public.attendance_evidence
));
select public._stage3_assert('active admin reads private storage evidence', (
  select pg_catalog.count(*) = 1 from storage.objects where bucket_id = 'attendance-evidence'
));
update public.attendance_sessions
set status = 'verified'
where id = '95000000-0000-4000-8000-000000000001';
delete from public.attendance_evidence
where id = '96000000-0000-4000-8000-000000000001';
select public._stage3_assert('active admin cannot bypass review with direct attendance update', (
  select status = 'pending_verification'
  from public.attendance_sessions
  where id = '95000000-0000-4000-8000-000000000001'
));
select public._stage3_assert('active admin cannot directly delete attendance evidence', (
  select pg_catalog.count(*) = 1
  from public.attendance_evidence
  where id = '96000000-0000-4000-8000-000000000001'
));
select public._stage3_assert('active admin cannot directly insert a review row', public._stage3_expect_failure(
  $sql$insert into public.attendance_reviews(attendance_session_id,reviewer_id,decision) values ('95000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','approve')$sql$
));
select public._stage3_assert('active admin cannot directly insert a QR hash', public._stage3_expect_failure(
  $sql$insert into public.event_qr_tokens(event_id,token_hash,expires_at,created_by) values ('94000000-0000-4000-8000-000000000001','direct-admin-hash',now()+interval '1 minute','92000000-0000-4000-8000-000000000001')$sql$
));
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select public._stage3_assert('inactive admin authorization fails', not public.is_active_admin());
select public._stage3_assert('inactive admin cannot read private evidence', (
  select pg_catalog.count(*) = 0 from public.attendance_evidence
));
select public._stage3_assert('inactive admin cannot read private storage evidence', (
  select pg_catalog.count(*) = 0 from storage.objects where bucket_id = 'attendance-evidence'
));
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
select public._stage3_assert('active super admin authorization succeeds', public.is_active_admin());
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
select public._stage3_assert('inactive super admin authorization fails', not public.is_active_admin());
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000005', true);
select public._stage3_assert('admin role without profile fails authorization', not public.is_active_admin());
reset role;

-- B. Active admin review is atomic, trusted, and idempotent.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('active admin valid review succeeds', (
  public.review_attendance_v2(
    '95000000-0000-4000-8000-000000000001',
    'approve',
    'Evidence confirmed',
    null
  ) ->> 'ok'
)::boolean);
reset role;

select public._stage3_assert('review updates canonical attendance', (
  select status = 'verified'
    and sync_status = 'verified'
    and reviewed_by = '92000000-0000-4000-8000-000000000001'
    and reviewed_at is not null
  from public.attendance_sessions
  where id = '95000000-0000-4000-8000-000000000001'
));
select public._stage3_assert('review row exists in same completed transaction', (
  select pg_catalog.count(*) = 1
  from public.attendance_reviews
  where attendance_session_id = '95000000-0000-4000-8000-000000000001'
    and reviewer_id = '92000000-0000-4000-8000-000000000001'
    and decision = 'approve'
));
select public._stage3_assert('trusted review audit record exists', (
  select pg_catalog.count(*) = 1
  from public.audit_logs
  where action = 'attendance.review'
    and entity_id = '95000000-0000-4000-8000-000000000001'
    and actor_user_id = '91000000-0000-4000-8000-000000000001'
    and metadata ->> 'actor_role' = 'admin'
    and metadata ->> 'decision' = 'approve'
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('exact repeated review returns idempotently', (
  select result ->> 'ok' = 'true' and result ->> 'idempotent' = 'true'
  from (
    select public.review_attendance_v2(
      '95000000-0000-4000-8000-000000000001', 'approve', 'Evidence confirmed', null
    ) as result
  ) repeated_review
));
reset role;
select public._stage3_assert('repeated review creates no duplicate effects', (
  (select pg_catalog.count(*) = 1 from public.attendance_reviews where attendance_session_id = '95000000-0000-4000-8000-000000000001')
  and (select pg_catalog.count(*) = 1 from public.audit_logs where action = 'attendance.review' and entity_id = '95000000-0000-4000-8000-000000000001')
));

-- C. Super admin can correct an existing requires-review outcome.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000003', true);
select public._stage3_assert('active super admin review succeeds', (
  public.review_attendance_v2(
    '95000000-0000-4000-8000-000000000002', 'excuse', 'Approved excuse', null
  ) ->> 'ok'
)::boolean);
reset role;
select public._stage3_assert('super admin identity is derived by database', (
  select status = 'excused'
    and reviewed_by = '92000000-0000-4000-8000-000000000003'
  from public.attendance_sessions
  where id = '95000000-0000-4000-8000-000000000002'
));

-- D. Inactive, missing-profile, student, and invalid-state reviews make no writes.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
select public._stage3_assert('inactive admin review is rejected', not (
  public.review_attendance_v2('95000000-0000-4000-8000-000000000003', 'approve', null, null) ->> 'ok'
)::boolean);
select public._stage3_assert('inactive admin QR generation is rejected', not (
  public.generate_event_qr_token('94000000-0000-4000-8000-000000000001', 30) ->> 'ok'
)::boolean);
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000004', true);
select public._stage3_assert('inactive super admin review is rejected', not (
  public.review_attendance_v2('95000000-0000-4000-8000-000000000004', 'approve', null, null) ->> 'ok'
)::boolean);
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000005', true);
select public._stage3_assert('missing-profile admin review is rejected', not (
  public.review_attendance_v2('95000000-0000-4000-8000-000000000005', 'approve', null, null) ->> 'ok'
)::boolean);
reset role;

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000006', true);
select public._stage3_assert('student review is rejected', not (
  public.review_attendance_v2('95000000-0000-4000-8000-000000000005', 'approve', null, null) ->> 'ok'
)::boolean);
select public._stage3_assert('student QR generation is rejected', not (
  public.generate_event_qr_token('94000000-0000-4000-8000-000000000001', 30) ->> 'ok'
)::boolean);
select public._stage3_assert('student cannot forge generic audit log', public._stage3_expect_failure(
  $sql$select public.log_audit('forged','attendance_session','95000000-0000-4000-8000-000000000005','{}'::jsonb)$sql$
));
reset role;

select public._stage3_assert('unauthorized review attempts leave no effects', (
  (select pg_catalog.count(*) = 0 from public.attendance_reviews where attendance_session_id in (
    '95000000-0000-4000-8000-000000000003',
    '95000000-0000-4000-8000-000000000004',
    '95000000-0000-4000-8000-000000000005'
  ))
  and (select pg_catalog.count(*) = 0 from public.audit_logs where action = 'attendance.review' and entity_id in (
    '95000000-0000-4000-8000-000000000003',
    '95000000-0000-4000-8000-000000000004',
    '95000000-0000-4000-8000-000000000005'
  ))
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('invalid review state is rejected', not (
  public.review_attendance_v2('95000000-0000-4000-8000-000000000006', 'approve', null, null) ->> 'ok'
)::boolean);
reset role;
select public._stage3_assert('invalid transition changes nothing', (
  select status = 'time_in_recorded'
    and reviewed_at is null
    and not exists (
      select 1 from public.attendance_reviews review_record
      where review_record.attendance_session_id = attendance_sessions.id
    )
  from public.attendance_sessions
  where id = '95000000-0000-4000-8000-000000000006'
));

-- E. A review-row failure rolls back the canonical attendance mutation.
create or replace function public._stage3_fail_review_insert()
returns trigger
language plpgsql
as $test$
begin
  if new.attendance_session_id = '95000000-0000-4000-8000-000000000007'::uuid then
    raise exception 'simulated review insert failure';
  end if;
  return new;
end;
$test$;

create trigger stage3_simulate_review_insert_failure
before insert on public.attendance_reviews
for each row execute function public._stage3_fail_review_insert();

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('simulated review insert failure reaches caller', public._stage3_expect_failure(
  $sql$select public.review_attendance_v2('95000000-0000-4000-8000-000000000007','approve',null,null)$sql$
));
reset role;
select public._stage3_assert('review insert failure rolls back attendance update and audit', (
  (select status = 'pending_verification' and reviewed_at is null from public.attendance_sessions where id = '95000000-0000-4000-8000-000000000007')
  and (select pg_catalog.count(*) = 0 from public.attendance_reviews where attendance_session_id = '95000000-0000-4000-8000-000000000007')
  and (select pg_catalog.count(*) = 0 from public.audit_logs where action = 'attendance.review' and entity_id = '95000000-0000-4000-8000-000000000007')
));

-- F. QR generation validates authorization/event state and commits hash + audit.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
create temporary table stage3_qr_result on commit drop as
select public.generate_event_qr_token('94000000-0000-4000-8000-000000000001', 30) as result;
select public._stage3_assert('eligible-event QR generation succeeds', (
  select result ->> 'ok' = 'true'
    and result ->> 'token' is not null
    and (result ->> 'expires_at')::timestamptz > pg_catalog.now()
  from stage3_qr_result
));
reset role;

select public._stage3_assert('QR plaintext is returned only after authoritative hash insert', (
  select pg_catalog.count(*) = 1
  from public.event_qr_tokens token_record
  cross join stage3_qr_result result_record
  where token_record.event_id = '94000000-0000-4000-8000-000000000001'
    and token_record.token_hash = pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(result_record.result ->> 'token', 'UTF8'), 'sha256'),
      'hex'
    )
    and token_record.token_hash <> result_record.result ->> 'token'
));
select public._stage3_assert('QR generation creates trusted audit', (
  select pg_catalog.count(*) = 1
  from public.audit_logs
  where action = 'event.qr.generated'
    and entity_id = '94000000-0000-4000-8000-000000000001'
    and actor_user_id = '91000000-0000-4000-8000-000000000001'
    and metadata ->> 'actor_role' = 'admin'
));

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('draft event QR is rejected', not (
  public.generate_event_qr_token('94000000-0000-4000-8000-000000000003', 30) ->> 'ok'
)::boolean);
select public._stage3_assert('deleted event QR is rejected', not (
  public.generate_event_qr_token('94000000-0000-4000-8000-000000000004', 30) ->> 'ok'
)::boolean);
reset role;
select public._stage3_assert('ineligible QR attempts create no token or audit', (
  (select pg_catalog.count(*) = 0 from public.event_qr_tokens where event_id in (
    '94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000004'
  ))
  and (select pg_catalog.count(*) = 0 from public.audit_logs where action = 'event.qr.generated' and entity_id in (
    '94000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000004'
  ))
));

create or replace function public._stage3_fail_qr_insert()
returns trigger
language plpgsql
as $test$
begin
  if new.event_id = '94000000-0000-4000-8000-000000000012'::uuid then
    raise exception 'simulated QR insert failure';
  end if;
  return new;
end;
$test$;

create trigger stage3_simulate_qr_insert_failure
before insert on public.event_qr_tokens
for each row execute function public._stage3_fail_qr_insert();

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
select public._stage3_assert('QR insert failure reaches caller before token return', public._stage3_expect_failure(
  $sql$select public.generate_event_qr_token('94000000-0000-4000-8000-000000000012',30)$sql$
));
reset role;
select public._stage3_assert('QR insert failure creates no token or audit', (
  (select pg_catalog.count(*) = 0 from public.event_qr_tokens where event_id = '94000000-0000-4000-8000-000000000012')
  and (select pg_catalog.count(*) = 0 from public.audit_logs where action = 'event.qr.generated' and entity_id = '94000000-0000-4000-8000-000000000012')
));

insert into public.event_qr_tokens (event_id, token_hash, expires_at)
values (
  '94000000-0000-4000-8000-000000000002',
  pg_catalog.encode(extensions.digest(pg_catalog.convert_to('stage3-expired-token', 'UTF8'), 'sha256'), 'hex'),
  pg_catalog.now() - interval '1 second'
);
select public._stage3_assert('expired QR hash does not validate', not public.validate_qr_token(
  '94000000-0000-4000-8000-000000000002', 'stage3-expired-token'
));

-- New canonical attendance rows retain a hash rather than plaintext QR secret.
insert into public.attendance_sessions (
  event_id, student_id, status, time_in_qr_token
) values (
  '94000000-0000-4000-8000-000000000013',
  '93000000-0000-4000-8000-000000000001',
  'pending_verification',
  'stage3-canonical-plaintext'
);
select public._stage3_assert('new canonical attendance QR evidence is one-way hashed', (
  select time_in_qr_token = 'sha256:' || pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to('stage3-canonical-plaintext', 'UTF8'), 'sha256'),
    'hex'
  )
  from public.attendance_sessions
  where event_id = '94000000-0000-4000-8000-000000000013'
));

-- G. Browser event writes create trusted database audit without log_audit access.
set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
insert into public.events (id, title, description, status)
values ('94000000-0000-4000-8000-000000000014', 'Stage 3 Browser Event', 'Trigger audit fixture.', 'draft');
reset role;
select public._stage3_assert('event mutation trigger records trusted actor and server audit', (
  select pg_catalog.count(*) = 1
  from public.audit_logs
  where action = 'event.created'
    and entity_id = '94000000-0000-4000-8000-000000000014'
    and actor_user_id = '91000000-0000-4000-8000-000000000001'
    and metadata ->> 'actor_role' = 'admin'
));

rollback;
