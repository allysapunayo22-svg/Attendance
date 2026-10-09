-- PLAN ONLY. Do not execute against production without explicit read approval.
-- Designed for schema 001-007 as well as 008-013; no later-only columns required.
-- Run through a verified, explicit connection; this file contains no credentials.
-- Expected future production ref: aeffervvqtejdmlmaoga (NOT authorized in this QA).
-- The database name alone cannot establish Supabase project identity.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '60s';
set local lock_timeout = '3s';

select current_database(), current_user, version();
select version from supabase_migrations.schema_migrations order by version;

-- Exact migration 010 predicates; count FALSE, matching CHECK semantics.
select '010_server_timestamp_order_violations' as diagnostic, count(*) as rows
from public.attendance_sessions
where (time_out_server_timestamp is null or
  (time_in_server_timestamp is not null and time_out_server_timestamp >= time_in_server_timestamp)) is false
union all
select '010_completed_timestamp_violations', count(*)
from public.attendance_sessions
where (status <> 'completed' or
  (time_in_server_timestamp is not null
   and (time_in_verified_timestamp is not null or reviewed_at is not null)
   and time_out_server_timestamp is not null and time_out_verified_timestamp is not null)) is false;

-- Duplicate groups AND excess rows. Do not delete/deduplicate anything.
select 'exact_duplicate_evidence' as diagnostic, count(*) as groups,
  coalesce(sum(n - 1), 0) as excess_rows
from (
  select count(*) n from public.attendance_evidence
  group by attendance_session_id, evidence_type, storage_path, photo_hash, metadata
  having count(*) > 1
) duplicates
union all
select 'duplicate_idempotency_keys', count(*), coalesce(sum(n - 1), 0)
from (select count(*) n from public.attendance_sync_records
      group by idempotency_key having count(*) > 1) duplicates
union all
select 'duplicate_student_local_id', count(*), coalesce(sum(n - 1), 0)
from (select count(*) n from public.attendance_sync_records
      group by student_id, local_id having count(*) > 1) duplicates;

-- Shape diagnostics only: a non-SHA256 value is suspicious, not proof of plaintext.
select 'qr_table_non_sha256' as diagnostic, count(*) as rows
from public.event_qr_tokens where token_hash !~ '^[0-9a-f]{64}$'
union all
select 'session_time_in_qr_non_sha256', count(*) from public.attendance_sessions
where time_in_qr_token is not null and time_in_qr_token !~ '^[0-9a-f]{64}$'
union all
select 'session_time_out_qr_non_sha256', count(*) from public.attendance_sessions
where time_out_qr_token is not null and time_out_qr_token !~ '^[0-9a-f]{64}$';

select 'device_checkout_before_checkin' as diagnostic, count(*) as rows
from public.attendance_sessions where time_out_device_timestamp < time_in_device_timestamp
union all
select 'verified_checkout_before_checkin', count(*) from public.attendance_sessions
where time_out_verified_timestamp < time_in_verified_timestamp
union all
select 'verified_timein_without_server_time', count(*) from public.attendance_sessions
where time_in_verified_timestamp is not null and time_in_server_timestamp is null
union all
select 'verified_timeout_without_server_time', count(*) from public.attendance_sessions
where time_out_verified_timestamp is not null and time_out_server_timestamp is null
union all
select 'completed_missing_coherent_server_order', count(*) from public.attendance_sessions
where status = 'completed' and
 (time_in_server_timestamp is null or time_out_server_timestamp is null
  or time_out_verified_timestamp is null
  or (time_in_verified_timestamp is null and reviewed_at is null)
  or time_out_server_timestamp < time_in_server_timestamp);

-- Retained privileged state is not proof it can be exercised; verify hardened RBAC separately.
select 'inactive_users_with_admin_profile' as diagnostic, count(*) as rows
from public.users u join public.admin_profiles a on a.user_id = u.id where not u.is_active
union all
select 'inactive_users_with_privileged_role', count(*) from public.users
where not is_active and role in ('admin', 'super_admin')
union all
select 'inactive_users_with_active_push_tokens', count(*) from public.users u
join public.push_tokens p on p.user_id = u.id where not u.is_active and p.is_active
union all
select 'privileged_users_missing_admin_profile', count(*) from public.users u
left join public.admin_profiles a on a.user_id = u.id
where u.role in ('admin', 'super_admin') and a.id is null
union all
select 'admin_profiles_with_non_admin_role', count(*) from public.admin_profiles a
join public.users u on u.id = a.user_id where u.role not in ('admin', 'super_admin');

select 'students_with_multiple_active_devices' as diagnostic, count(*) as rows
from (select student_id from public.devices where is_active group by student_id having count(*) > 1) d
union all
select 'active_devices_for_inactive_student_or_user', count(*) from public.devices d
join public.student_profiles s on s.id = d.student_id join public.users u on u.id = s.user_id
where d.is_active and (not s.is_active or not u.is_active)
union all
select 'attendance_device_student_mismatch', count(*) from public.attendance_sessions a
join public.devices d on d.id = a.device_id where a.student_id <> d.student_id
union all
select 'devices_missing_fingerprint', count(*) from public.devices
where btrim(device_fingerprint) = ''
union all
select 'devices_without_student', count(*) from public.devices d
left join public.student_profiles s on s.id = d.student_id where s.id is null;

-- Metadata only: never output signed URLs, QR values, photo bodies or credentials.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_catalog.pg_policies where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
select n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage') and c.relkind = 'r' order by 1, 2;
select conname, convalidated, pg_catalog.pg_get_constraintdef(oid)
from pg_catalog.pg_constraint where conrelid = 'public.attendance_sessions'::regclass
and conname in ('attendance_sessions_server_timestamp_order_check', 'attendance_sessions_completed_timestamps_check');

rollback;
