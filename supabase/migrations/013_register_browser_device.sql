-- Phase 2B prerequisite: atomic, authenticated Student Web device enrollment.
-- Browser fingerprints are opaque local identifiers, not proof of hardware identity.

create or replace function public.register_student_device_v1(
  p_fingerprint_hash text,
  p_browser_label text default 'Web Browser'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_user_id uuid := auth.uid();
  student_record record;
  matching_device_id uuid;
  active_device_count integer;
  browser_label text := pg_catalog.btrim(p_browser_label);
  was_existing boolean := false;
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to register this browser.';
  end if;

  if p_fingerprint_hash is null
    or p_fingerprint_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Browser fingerprint must be a lowercase SHA-256 hash.';
  end if;

  if browser_label is null
    or pg_catalog.char_length(browser_label) < 1
    or pg_catalog.char_length(browser_label) > 80
    or browser_label ~ '[[:cntrl:]]' then
    raise exception using
      errcode = '22023',
      message = 'Browser label must contain 1 to 80 printable characters.';
  end if;

  select
    user_record.id as user_id,
    user_record.role,
    user_record.is_active as user_is_active,
    student_profile.id as student_id,
    student_profile.is_active as student_is_active
  into student_record
  from public.users user_record
  join public.student_profiles student_profile
    on student_profile.user_id = user_record.id
  where user_record.id = caller_user_id
  for update of student_profile;

  if not found
    or student_record.role <> 'student'::public.user_role
    or not student_record.user_is_active
    or not student_record.student_is_active then
    raise exception using
      errcode = '42501',
      message = 'An active student account is required to register this browser.';
  end if;

  select device_record.id
  into matching_device_id
  from public.devices device_record
  where device_record.student_id = student_record.student_id
    and device_record.device_fingerprint = p_fingerprint_hash;

  was_existing := matching_device_id is not null;

  update public.devices
  set is_active = false
  where student_id = student_record.student_id
    and is_active = true;

  if matching_device_id is null then
    insert into public.devices (
      student_id,
      device_fingerprint,
      platform,
      device_name,
      app_version,
      is_active,
      last_seen_at
    ) values (
      student_record.student_id,
      p_fingerprint_hash,
      'web',
      browser_label,
      'student-web',
      true,
      pg_catalog.now()
    )
    returning id into matching_device_id;
  else
    update public.devices
    set
      platform = 'web',
      device_name = browser_label,
      app_version = 'student-web',
      is_active = true,
      last_seen_at = pg_catalog.now()
    where id = matching_device_id
      and student_id = student_record.student_id;
  end if;

  select pg_catalog.count(*)::integer
  into active_device_count
  from public.devices device_record
  where device_record.student_id = student_record.student_id
    and device_record.is_active = true;

  if active_device_count <> 1
    or not exists (
      select 1
      from public.devices device_record
      where device_record.id = matching_device_id
        and device_record.student_id = student_record.student_id
        and device_record.is_active = true
    ) then
    raise exception using
      errcode = '23514',
      message = 'Browser registration did not produce exactly one active device.';
  end if;

  insert into public.audit_logs (
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    caller_user_id,
    'device.browser_registered',
    'device',
    matching_device_id,
    pg_catalog.jsonb_build_object(
      'platform', 'web',
      'reactivated', was_existing
    )
  );

  return pg_catalog.jsonb_build_object(
    'status', 'active',
    'device_id', matching_device_id,
    'platform', 'web'
  );
end;
$$;

create or replace function public.resolve_student_device_v1(
  p_fingerprint_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_user_id uuid := auth.uid();
  student_record record;
  matching_device record;
  has_active_device boolean := false;
begin
  if caller_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication is required to resolve this browser.';
  end if;

  if p_fingerprint_hash is null
    or p_fingerprint_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Browser fingerprint must be a lowercase SHA-256 hash.';
  end if;

  select
    user_record.role,
    user_record.is_active as user_is_active,
    student_profile.id as student_id,
    student_profile.is_active as student_is_active
  into student_record
  from public.users user_record
  join public.student_profiles student_profile
    on student_profile.user_id = user_record.id
  where user_record.id = caller_user_id;

  if not found
    or student_record.role <> 'student'::public.user_role
    or not student_record.user_is_active
    or not student_record.student_is_active then
    raise exception using
      errcode = '42501',
      message = 'An active student account is required to resolve this browser.';
  end if;

  select device_record.id, device_record.is_active
  into matching_device
  from public.devices device_record
  where device_record.student_id = student_record.student_id
    and device_record.device_fingerprint = p_fingerprint_hash;

  select exists (
    select 1
    from public.devices device_record
    where device_record.student_id = student_record.student_id
      and device_record.is_active = true
  ) into has_active_device;

  if matching_device.id is not null and matching_device.is_active then
    return pg_catalog.jsonb_build_object(
      'status', 'active',
      'device_id', matching_device.id,
      'platform', 'web'
    );
  end if;

  if matching_device.id is not null then
    return pg_catalog.jsonb_build_object(
      'status', 'inactive',
      'device_id', null,
      'another_device_active', has_active_device
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'status', case when has_active_device then 'another_device_active' else 'unregistered' end,
    'device_id', null,
    'another_device_active', has_active_device
  );
end;
$$;

alter function public.register_student_device_v1(text, text) owner to postgres;
alter function public.resolve_student_device_v1(text) owner to postgres;

revoke all on function public.register_student_device_v1(text, text) from public, anon, authenticated;
revoke all on function public.resolve_student_device_v1(text) from public, anon, authenticated;

grant execute on function public.register_student_device_v1(text, text) to authenticated;
grant execute on function public.resolve_student_device_v1(text) to authenticated;

comment on function public.register_student_device_v1(text, text) is
  'Atomically registers the authenticated active student browser as their sole active attendance device.';

comment on function public.resolve_student_device_v1(text) is
  'Resolves whether the authenticated active student browser remains the active attendance device.';
