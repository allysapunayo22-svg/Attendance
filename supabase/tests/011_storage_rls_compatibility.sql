-- Hosted-compatibility regression for migration 011. This simulates the
-- managed storage.objects table being owned by a role other than the migration
-- role while RLS is already enabled.

\set ON_ERROR_STOP on

begin;

alter table storage.objects owner to authenticated;
alter table storage.objects enable row level security;

\ir ../migrations/011_admin_review_hardening.sql

do $test$
declare
  storage_objects_owner name;
  storage_objects_rls_enabled boolean;
  evidence_policy_count bigint;
begin
  select
    pg_catalog.pg_get_userbyid(table_record.relowner),
    table_record.relrowsecurity
  into storage_objects_owner, storage_objects_rls_enabled
  from pg_catalog.pg_class table_record
  join pg_catalog.pg_namespace schema_record
    on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'storage'
    and table_record.relname = 'objects';

  if storage_objects_owner <> 'authenticated'::name then
    raise exception 'Hosted simulation changed the managed storage.objects owner.';
  end if;

  if storage_objects_rls_enabled is not true then
    raise exception 'Hosted simulation did not preserve storage.objects RLS.';
  end if;

  select pg_catalog.count(*)
  into evidence_policy_count
  from pg_catalog.pg_policy policy_record
  join pg_catalog.pg_class table_record on table_record.oid = policy_record.polrelid
  join pg_catalog.pg_namespace schema_record on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'storage'
    and table_record.relname = 'objects'
    and policy_record.polname = 'students read own evidence files';

  if evidence_policy_count <> 1 then
    raise exception 'Hosted simulation did not preserve the attendance-evidence read policy.';
  end if;

  raise notice 'PASS: hosted-style non-owner storage.objects migration compatibility';
end;
$test$;

rollback;
