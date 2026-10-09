-- Migration 011: Active-administrator authorization, transactional attendance
-- review, authoritative QR generation, trusted audit logging, and private
-- attendance-evidence access hardening.

create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.users user_record
    join public.admin_profiles admin_record on admin_record.user_id = user_record.id
    where user_record.id = auth.uid()
      and user_record.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
      and user_record.is_active = true
  )
$$;

alter function public.is_active_admin() owner to postgres;
revoke all on function public.is_active_admin() from public, anon, authenticated;
grant execute on function public.is_active_admin() to anon, authenticated;

comment on function public.is_active_admin() is
  'Returns whether auth.uid() belongs to an active admin or super-admin with an admin profile.';

-- Attendance-sensitive RLS keeps the existing administrative capabilities but
-- now rejects inactive accounts and administrator roles without a profile.

drop policy if exists "admins manage attendance" on public.attendance_sessions;
drop policy if exists "active admins read attendance" on public.attendance_sessions;
create policy "active admins read attendance" on public.attendance_sessions
  for select using (public.is_active_admin());

drop policy if exists "students read own attendance" on public.attendance_sessions;
create policy "students read own attendance" on public.attendance_sessions
  for select using (
    student_id = public.current_student_profile_id()
    or public.is_active_admin()
  );

drop policy if exists "admins manage evidence" on public.attendance_evidence;
drop policy if exists "active admins read evidence" on public.attendance_evidence;
create policy "active admins read evidence" on public.attendance_evidence
  for select using (public.is_active_admin());

drop policy if exists "students read own attendance evidence" on public.attendance_evidence;
create policy "students read own attendance evidence" on public.attendance_evidence
  for select using (
    public.is_active_admin()
    or exists (
      select 1
      from public.attendance_sessions session_record
      where session_record.id = attendance_session_id
        and session_record.student_id = public.current_student_profile_id()
    )
  );

drop policy if exists "admins manage sync records" on public.attendance_sync_records;
drop policy if exists "active admins read sync records" on public.attendance_sync_records;
create policy "active admins read sync records" on public.attendance_sync_records
  for select using (public.is_active_admin());

drop policy if exists "students read own sync records" on public.attendance_sync_records;
create policy "students read own sync records" on public.attendance_sync_records
  for select using (
    student_id = public.current_student_profile_id()
    or public.is_active_admin()
  );

drop policy if exists "admins manage reviews" on public.attendance_reviews;
drop policy if exists "active admins read reviews" on public.attendance_reviews;
create policy "active admins read reviews" on public.attendance_reviews
  for select using (public.is_active_admin());

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs
  for select using (public.is_active_admin());

drop policy if exists "admins manage qr tokens" on public.event_qr_tokens;
drop policy if exists "active admins read qr tokens" on public.event_qr_tokens;
create policy "active admins read qr tokens" on public.event_qr_tokens
  for select using (public.is_active_admin());

-- Hosted Supabase owns storage.objects through its managed Storage role. Only
-- enable RLS in isolated/local databases where the migration role owns the
-- simulated table; otherwise verify the hosted-managed RLS state without
-- attempting ownership-level DDL.
do $$
declare
  storage_objects_owner name;
  storage_objects_rls_enabled boolean;
begin
  select
    pg_catalog.pg_get_userbyid(table_record.relowner),
    table_record.relrowsecurity
  into storage_objects_owner, storage_objects_rls_enabled
  from pg_catalog.pg_class table_record
  join pg_catalog.pg_namespace schema_record
    on schema_record.oid = table_record.relnamespace
  where schema_record.nspname = 'storage'
    and table_record.relname = 'objects'
    and table_record.relkind in ('r', 'p');

  if not found then
    raise exception 'Required managed table storage.objects does not exist.';
  end if;

  if storage_objects_owner = current_user then
    alter table storage.objects enable row level security;
    storage_objects_rls_enabled := true;
  end if;

  if storage_objects_rls_enabled is not true then
    raise exception
      'RLS must already be enabled on managed table storage.objects; owner is %, migration role is %.',
      storage_objects_owner,
      current_user;
  end if;
end;
$$;

drop policy if exists "students read own evidence files" on storage.objects;
create policy "students read own evidence files" on storage.objects
  for select using (
    bucket_id = 'attendance-evidence'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_active_admin()
    )
  );

create or replace function public.review_attendance_v2(
  p_attendance_session_id uuid,
  p_decision text,
  p_notes text default null,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  server_now constant timestamptz := pg_catalog.now();
  caller_user_id uuid := auth.uid();
  admin_record record;
  attendance_record public.attendance_sessions%rowtype;
  target_status public.attendance_status;
  target_sync_status public.sync_status;
  clean_notes text := nullif(pg_catalog.btrim(p_notes), '');
  clean_rejection_reason text := nullif(pg_catalog.btrim(p_rejection_reason), '');
  trusted_reason text;
  matching_review_exists boolean := false;
begin
  select
    user_record.role,
    admin_profile.id as admin_profile_id
  into admin_record
  from public.users user_record
  join public.admin_profiles admin_profile on admin_profile.user_id = user_record.id
  where user_record.id = caller_user_id
    and user_record.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
    and user_record.is_active = true;

  if caller_user_id is null or not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'administrator_access_required',
      'error', 'An active administrator account and profile are required.'
    );
  end if;

  if p_attendance_session_id is null then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_attendance_session',
      'error', 'A valid attendance session identifier is required.'
    );
  end if;

  if p_decision is null or p_decision not in ('approve', 'reject', 'late', 'excuse') then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_review_decision',
      'error', 'Review decision must be approve, reject, late, or excuse.'
    );
  end if;

  if pg_catalog.length(clean_notes) > 2000
    or pg_catalog.length(clean_rejection_reason) > 2000 then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'review_text_too_long',
      'error', 'Review notes and rejection reasons must not exceed 2000 characters.'
    );
  end if;

  if p_decision = 'reject' and clean_rejection_reason is null then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'rejection_reason_required',
      'error', 'A rejection reason is required.'
    );
  end if;

  target_status := case p_decision
    when 'approve' then 'verified'::public.attendance_status
    when 'reject' then 'rejected'::public.attendance_status
    when 'late' then 'late'::public.attendance_status
    when 'excuse' then 'excused'::public.attendance_status
  end;

  target_sync_status := case
    when p_decision = 'approve' then 'verified'::public.sync_status
    else 'requires_review'::public.sync_status
  end;

  select *
  into attendance_record
  from public.attendance_sessions
  where id = p_attendance_session_id
  for update;

  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'attendance_session_not_found',
      'error', 'Attendance session was not found.'
    );
  end if;

  if attendance_record.status = target_status then
    select exists (
      select 1
      from public.attendance_reviews review_record
      where review_record.attendance_session_id = attendance_record.id
        and review_record.decision = p_decision
    ) into matching_review_exists;

    if matching_review_exists then
      return pg_catalog.jsonb_build_object(
        'ok', true,
        'status', target_status,
        'idempotent', true
      );
    end if;

    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_review_transition',
      'error', 'Attendance is already in the requested state without a matching review operation.'
    );
  end if;

  if attendance_record.status <> 'pending_verification'::public.attendance_status
    and attendance_record.sync_status <> 'requires_review'::public.sync_status then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'attendance_not_reviewable',
      'error', 'This attendance session is not currently awaiting administrator review.'
    );
  end if;

  trusted_reason := coalesce(
    clean_rejection_reason,
    clean_notes,
    'Administrator marked attendance as ' || target_status::text || '.'
  );

  update public.attendance_sessions
  set
    status = target_status,
    sync_status = target_sync_status,
    reviewed_by = admin_record.admin_profile_id,
    reviewed_at = server_now,
    verification_reason = trusted_reason
  where id = attendance_record.id;

  insert into public.attendance_reviews (
    attendance_session_id,
    reviewer_id,
    decision,
    notes,
    rejection_reason,
    created_at
  ) values (
    attendance_record.id,
    admin_record.admin_profile_id,
    p_decision,
    clean_notes,
    case when p_decision = 'reject' then clean_rejection_reason else null end,
    server_now
  );

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    caller_user_id,
    'attendance.review',
    'attendance_session',
    attendance_record.id,
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'actor_role', admin_record.role,
      'reviewer_profile_id', admin_record.admin_profile_id,
      'decision', p_decision,
      'previous_status', attendance_record.status,
      'resulting_status', target_status,
      'notes', clean_notes,
      'rejection_reason', case when p_decision = 'reject' then clean_rejection_reason else null end
    )),
    server_now
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'status', target_status,
    'idempotent', false
  );
end;
$$;

alter function public.review_attendance_v2(uuid, text, text, text) owner to postgres;
revoke all on function public.review_attendance_v2(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function public.review_attendance_v2(uuid, text, text, text)
  to authenticated;

comment on function public.review_attendance_v2(uuid, text, text, text) is
  'Atomically applies an authenticated active-administrator attendance review and trusted audit entry.';

create or replace function public.generate_event_qr_token(
  p_event_id uuid,
  p_ttl_seconds integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  server_now constant timestamptz := pg_catalog.now();
  caller_user_id uuid := auth.uid();
  admin_record record;
  event_record public.events%rowtype;
  expires_at timestamptz;
  plaintext_token text;
  token_hash text;
  qr_token_id uuid;
begin
  select
    user_record.role,
    admin_profile.id as admin_profile_id
  into admin_record
  from public.users user_record
  join public.admin_profiles admin_profile on admin_profile.user_id = user_record.id
  where user_record.id = caller_user_id
    and user_record.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
    and user_record.is_active = true;

  if caller_user_id is null or not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'administrator_access_required',
      'error', 'An active administrator account and profile are required.'
    );
  end if;

  if p_event_id is null or p_ttl_seconds is null or p_ttl_seconds < 10 or p_ttl_seconds > 300 then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'invalid_qr_request',
      'error', 'Event identifier and a TTL from 10 to 300 seconds are required.'
    );
  end if;

  select *
  into event_record
  from public.events
  where id = p_event_id;

  if not found then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'event_not_found',
      'error', 'Event was not found.'
    );
  end if;

  if event_record.deleted_at is not null
    or event_record.status not in ('published'::public.event_status, 'ongoing'::public.event_status) then
    return pg_catalog.jsonb_build_object(
      'ok', false,
      'code', 'event_not_qr_eligible',
      'error', 'QR codes can only be generated for active published or ongoing events.'
    );
  end if;

  expires_at := server_now + pg_catalog.make_interval(secs => p_ttl_seconds);
  plaintext_token := p_event_id::text || ':' ||
    pg_catalog.floor(extract(epoch from expires_at))::bigint::text || ':' ||
    public.gen_random_uuid()::text;
  token_hash := pg_catalog.encode(
    public.digest(pg_catalog.convert_to(plaintext_token, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.event_qr_tokens (
    event_id,
    token_hash,
    expires_at,
    created_by
  ) values (
    event_record.id,
    token_hash,
    expires_at,
    admin_record.admin_profile_id
  ) returning id into qr_token_id;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    caller_user_id,
    'event.qr.generated',
    'event',
    event_record.id,
    pg_catalog.jsonb_build_object(
      'actor_role', admin_record.role,
      'admin_profile_id', admin_record.admin_profile_id,
      'qr_token_id', qr_token_id,
      'ttl_seconds', p_ttl_seconds,
      'expires_at', expires_at
    ),
    server_now
  );

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'token', plaintext_token,
    'expires_at', expires_at
  );
end;
$$;

alter function public.generate_event_qr_token(uuid, integer) owner to postgres;
revoke all on function public.generate_event_qr_token(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.generate_event_qr_token(uuid, integer)
  to authenticated;

comment on function public.generate_event_qr_token(uuid, integer) is
  'Creates and returns one short-lived QR secret after its hash and audit record are committed.';

-- New canonical attendance writes retain only a one-way representation of QR
-- evidence. Existing historical values are not rewritten in this migration.

create or replace function public.hash_new_attendance_qr_secrets()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.time_in_qr_token is not null
    and (tg_op = 'INSERT' or new.time_in_qr_token is distinct from old.time_in_qr_token)
    and new.time_in_qr_token not like 'sha256:%' then
    new.time_in_qr_token := 'sha256:' || pg_catalog.encode(
      public.digest(pg_catalog.convert_to(new.time_in_qr_token, 'UTF8'), 'sha256'),
      'hex'
    );
  end if;

  if new.time_out_qr_token is not null
    and (tg_op = 'INSERT' or new.time_out_qr_token is distinct from old.time_out_qr_token)
    and new.time_out_qr_token not like 'sha256:%' then
    new.time_out_qr_token := 'sha256:' || pg_catalog.encode(
      public.digest(pg_catalog.convert_to(new.time_out_qr_token, 'UTF8'), 'sha256'),
      'hex'
    );
  end if;

  return new;
end;
$$;

alter function public.hash_new_attendance_qr_secrets() owner to postgres;
revoke all on function public.hash_new_attendance_qr_secrets()
  from public, anon, authenticated;

drop trigger if exists attendance_sessions_hash_new_qr_secrets
  on public.attendance_sessions;
create trigger attendance_sessions_hash_new_qr_secrets
before insert or update of time_in_qr_token, time_out_qr_token
on public.attendance_sessions
for each row execute function public.hash_new_attendance_qr_secrets();

-- Event mutations are still performed by the existing Admin Web forms. Audit
-- them at the database boundary so the browser no longer invokes log_audit.

create or replace function public.audit_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_user_id uuid := auth.uid();
  actor_record record;
  target_event public.events%rowtype;
  audit_action text;
begin
  if caller_user_id is null then
    return coalesce(new, old);
  end if;

  select role, is_active
  into actor_record
  from public.users
  where id = caller_user_id;

  if not found then
    return coalesce(new, old);
  end if;

  target_event := case when tg_op = 'DELETE' then old else new end;
  audit_action := case
    when tg_op = 'INSERT' then 'event.created'
    when tg_op = 'DELETE' or (old.deleted_at is null and new.deleted_at is not null) then 'event.deleted'
    else 'event.updated'
  end;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    caller_user_id,
    audit_action,
    'event',
    target_event.id,
    pg_catalog.jsonb_build_object(
      'actor_role', actor_record.role,
      'actor_account_active', actor_record.is_active,
      'title', target_event.title,
      'status', target_event.status
    )
  );

  return coalesce(new, old);
end;
$$;

alter function public.audit_event_mutation() owner to postgres;
revoke all on function public.audit_event_mutation()
  from public, anon, authenticated;

drop trigger if exists events_write_trusted_audit on public.events;
create trigger events_write_trusted_audit
after insert or update or delete on public.events
for each row execute function public.audit_event_mutation();

-- No active browser or Edge caller should invoke this generic legacy helper
-- after the Stage 3 code migration. Keep it only for forensic compatibility.

alter function public.log_audit(text, text, uuid, jsonb) owner to postgres;
alter function public.log_audit(text, text, uuid, jsonb)
  set search_path = pg_catalog, public;
revoke all on function public.log_audit(text, text, uuid, jsonb)
  from public, anon, authenticated;
