-- Rollback-only regression tests for migration 012.
-- Run after migrations 001-012 in the isolated Supabase-compatible database.

\set ON_ERROR_STOP on

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

select pg_temp.assert_true(
  (
    select schema_record.nspname = 'extensions'
    from pg_catalog.pg_extension extension_record
    join pg_catalog.pg_namespace schema_record
      on schema_record.oid = extension_record.extnamespace
    where extension_record.extname = 'pgcrypto'
  ),
  'pgcrypto must be installed in the hosted-compatible extensions schema'
);

select pg_temp.assert_true(
  pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to('abc', 'UTF8'), 'sha256'),
    'hex'
  ) = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  'extensions.digest must be callable and return the expected SHA-256 value'
);

select pg_temp.assert_true(
  extensions.gen_random_uuid() is not null,
  'extensions.gen_random_uuid must be callable for QR secret generation'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_proc function_record
    join pg_catalog.pg_namespace schema_record
      on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.proname in (
        'submit_attendance_v2',
        'generate_event_qr_token',
        'validate_qr_token',
        'hash_new_attendance_qr_secrets'
      )
      and function_record.prosrc not like '%extensions.digest(%'
  ),
  'all four active hashing functions must use extensions.digest'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_proc function_record
    join pg_catalog.pg_namespace schema_record
      on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.proname in (
        'submit_attendance_v2',
        'generate_event_qr_token',
        'validate_qr_token',
        'hash_new_attendance_qr_secrets'
      )
      and function_record.prosrc like '%public.digest(%'
  ),
  'no active hashing function may retain a public.digest reference'
);

select pg_temp.assert_true(
  (
    select function_record.prosrc like '%extensions.gen_random_uuid()%'
      and function_record.prosrc not like '%public.gen_random_uuid()%'
    from pg_catalog.pg_proc function_record
    join pg_catalog.pg_namespace schema_record
      on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.proname = 'generate_event_qr_token'
  ),
  'QR generation must use the hosted-compatible UUID generator'
);

select pg_temp.assert_true(
  not pg_catalog.has_function_privilege(
    'anon',
    'public.submit_attendance_v2(uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  )
  and pg_catalog.has_function_privilege(
    'authenticated',
    'public.submit_attendance_v2(uuid,text,timestamptz,double precision,double precision,double precision,text,text,text,uuid,text,text,boolean)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'anon',
    'public.generate_event_qr_token(uuid,integer)',
    'EXECUTE'
  )
  and pg_catalog.has_function_privilege(
    'authenticated',
    'public.generate_event_qr_token(uuid,integer)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'public.validate_qr_token(uuid,text)',
    'EXECUTE'
  )
  and not pg_catalog.has_function_privilege(
    'authenticated',
    'public.hash_new_attendance_qr_secrets()',
    'EXECUTE'
  ),
  'migration 012 must preserve the hardened function grants'
);

select pg_temp.assert_true(
  not exists (
    select 1
    from pg_catalog.pg_proc function_record
    join pg_catalog.pg_namespace schema_record
      on schema_record.oid = function_record.pronamespace
    where schema_record.nspname = 'public'
      and function_record.proname in (
        'submit_attendance_v2',
        'generate_event_qr_token',
        'validate_qr_token',
        'hash_new_attendance_qr_secrets'
      )
      and (
        pg_catalog.pg_get_userbyid(function_record.proowner) <> 'postgres'
        or function_record.proconfig is distinct from array['search_path=pg_catalog, public']::text[]
        or (
          function_record.proname <> 'hash_new_attendance_qr_secrets'
          and not function_record.prosecdef
        )
        or (
          function_record.proname = 'hash_new_attendance_qr_secrets'
          and function_record.prosecdef
        )
      )
  ),
  'function owner, SECURITY DEFINER state, and pinned search_path must be preserved'
);

select pg_temp.assert_true(
  exists (
    select 1
    from pg_catalog.pg_trigger trigger_record
    join pg_catalog.pg_class table_record on table_record.oid = trigger_record.tgrelid
    join pg_catalog.pg_namespace schema_record on schema_record.oid = table_record.relnamespace
    join pg_catalog.pg_proc function_record on function_record.oid = trigger_record.tgfoid
    where not trigger_record.tgisinternal
      and trigger_record.tgname = 'attendance_sessions_hash_new_qr_secrets'
      and schema_record.nspname = 'public'
      and table_record.relname = 'attendance_sessions'
      and function_record.proname = 'hash_new_attendance_qr_secrets'
      and trigger_record.tgenabled = 'O'
  ),
  'attendance QR hashing trigger must remain enabled and bound to its function'
);

insert into auth.users (id, email) values
  ('a1200000-0000-4000-8000-000000000001', 'migration012-admin@test.invalid'),
  ('a1200000-0000-4000-8000-000000000002', 'migration012-student@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('a1200000-0000-4000-8000-000000000001', 'admin', 'migration012-admin@test.invalid', 'Migration 012 Admin', true),
  ('a1200000-0000-4000-8000-000000000002', 'student', 'migration012-student@test.invalid', 'Migration 012 Student', true);

insert into public.admin_profiles (id, user_id, full_name, email) values (
  'a1200000-0000-4000-8000-000000000011',
  'a1200000-0000-4000-8000-000000000001',
  'Migration 012 Admin',
  'migration012-admin@test.invalid'
);

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active) values (
  'a1200000-0000-4000-8000-000000000012',
  'a1200000-0000-4000-8000-000000000002',
  'MIGRATION-012',
  'Migration 012 Student',
  'migration012-student@test.invalid',
  true
);

insert into public.events (id, title, description, status, dynamic_qr_required) values
  ('a1200000-0000-4000-8000-000000000021', 'Migration 012 QR generation', 'Rollback-only fixture.', 'published', true),
  ('a1200000-0000-4000-8000-000000000022', 'Migration 012 QR validation', 'Rollback-only fixture.', 'published', true),
  ('a1200000-0000-4000-8000-000000000023', 'Migration 012 QR trigger', 'Rollback-only fixture.', 'published', false);

set local role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub', 'a1200000-0000-4000-8000-000000000001', true);
create temporary table migration012_qr_result on commit drop as
select public.generate_event_qr_token(
  'a1200000-0000-4000-8000-000000000021',
  30
) as result;
reset role;

select pg_temp.assert_true(
  exists (
    select 1
    from public.event_qr_tokens token_record
    cross join migration012_qr_result result_record
    where token_record.event_id = 'a1200000-0000-4000-8000-000000000021'
      and token_record.token_hash = pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(result_record.result ->> 'token', 'UTF8'),
          'sha256'
        ),
        'hex'
      )
      and token_record.token_hash <> result_record.result ->> 'token'
  ),
  'QR generation must store the hosted-compatible digest rather than plaintext'
);

insert into public.event_qr_tokens (event_id, token_hash, expires_at) values (
  'a1200000-0000-4000-8000-000000000022',
  pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to('migration012-valid-token', 'UTF8'), 'sha256'),
    'hex'
  ),
  pg_catalog.now() + interval '1 minute'
);

select pg_temp.assert_true(
  public.validate_qr_token(
    'a1200000-0000-4000-8000-000000000022',
    'migration012-valid-token'
  ),
  'QR validation must hash plaintext through extensions.digest'
);

insert into public.attendance_sessions (
  event_id,
  student_id,
  status,
  time_in_qr_token,
  time_out_qr_token
) values (
  'a1200000-0000-4000-8000-000000000023',
  'a1200000-0000-4000-8000-000000000012',
  'pending_verification',
  'migration012-time-in-secret',
  'migration012-time-out-secret'
);

select pg_temp.assert_true(
  (
    select time_in_qr_token = 'sha256:' || pg_catalog.encode(
        extensions.digest(pg_catalog.convert_to('migration012-time-in-secret', 'UTF8'), 'sha256'),
        'hex'
      )
      and time_out_qr_token = 'sha256:' || pg_catalog.encode(
        extensions.digest(pg_catalog.convert_to('migration012-time-out-secret', 'UTF8'), 'sha256'),
        'hex'
      )
    from public.attendance_sessions
    where event_id = 'a1200000-0000-4000-8000-000000000023'
  ),
  'attendance QR trigger must hash both new plaintext QR values'
);

select 'migration 012 rollback-only hosted pgcrypto compatibility tests passed' as result;

rollback;
