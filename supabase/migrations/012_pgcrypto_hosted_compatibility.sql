-- Migration 012: Hosted Supabase pgcrypto compatibility.
--
-- Supabase installs pgcrypto in the extensions schema. Keep the hardened
-- functions' search_path pinned and call digest through its owning schema.
-- Existing data and trigger bindings are intentionally left unchanged.

create or replace function public.validate_qr_token(
  p_event_id uuid,
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  submitted_hash text;
begin
  if p_token is null or p_token = '' then
    return false;
  end if;

  submitted_hash := pg_catalog.encode(extensions.digest(p_token, 'sha256'), 'hex');

  return exists (
    select 1
    from public.event_qr_tokens
    where event_id = p_event_id
      and token_hash = submitted_hash
      and expires_at >= pg_catalog.now()
  );
end;
$$;

create or replace function public.submit_attendance_v2(
  p_event_id uuid,
  p_mode text,
  p_device_timestamp timestamptz,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy_meters double precision,
  p_photo_storage_path text,
  p_photo_hash text,
  p_qr_token text,
  p_device_id uuid,
  p_local_id text,
  p_idempotency_key text,
  p_is_offline_submission boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  server_now constant timestamptz := pg_catalog.now();
  caller_user_id uuid := auth.uid();
  student_record record;
  event_record public.events%rowtype;
  schedule_record public.event_schedules%rowtype;
  location_record public.event_locations%rowtype;
  device_record public.devices%rowtype;
  existing_session public.attendance_sessions%rowtype;
  previous_sync public.attendance_sync_records%rowtype;
  attendance_session_id uuid;
  point_geog public.geography(point, 4326);
  point_geom public.geometry(point, 4326);
  distance_meters double precision;
  is_inside boolean := false;
  has_zones boolean := false;
  assignment_allowed boolean := false;
  resolved_status public.attendance_status := 'rejected';
  result_sync_status public.sync_status := 'failed';
  accepted boolean := false;
  reason text := 'Attendance submission was rejected.';
  flags text[] := '{}';
  payload_hash text;
  result_payload jsonb;
  storage_object jsonb;
  object_metadata jsonb;
  object_mime_type text;
  object_size_text text;
  object_size bigint;
  path_parts text[];
  expected_filename boolean := false;
  duration_minutes integer;
begin
  if caller_user_id is null then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'Authentication is required for attendance.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  select
    u.id as user_id,
    u.role,
    u.is_active as user_is_active,
    sp.id as student_id,
    sp.course_id,
    sp.section_id,
    sp.year_level,
    sp.is_active as student_is_active
  into student_record
  from public.users u
  join public.student_profiles sp on sp.user_id = u.id
  where u.id = caller_user_id;

  if not found
    or student_record.role <> 'student'::public.user_role
    or not student_record.user_is_active
    or not student_record.student_is_active then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'An active student account is required for attendance.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_mode is null or p_mode not in ('time_in', 'time_out') then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'Attendance mode must be time_in or time_out.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_event_id is null or p_device_id is null then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'Event and device identifiers are required.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_local_id is null
    or p_local_id !~ '^[A-Za-z0-9_-]{8,200}$'
    or p_idempotency_key is null
    or pg_catalog.length(p_idempotency_key) < 12
    or pg_catalog.length(p_idempotency_key) > 500 then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'Valid local and idempotency identifiers are required.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_device_timestamp is null then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'A valid device timestamp is required.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_latitude is null
    or p_latitude::text in ('NaN', 'Infinity', '-Infinity')
    or p_latitude < -90
    or p_latitude > 90
    or p_longitude is null
    or p_longitude::text in ('NaN', 'Infinity', '-Infinity')
    or p_longitude < -180
    or p_longitude > 180 then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'Valid latitude and longitude values are required.',
      'suspicious_flags', array[]::text[]
    );
  end if;

  if p_accuracy_meters is null
    or p_accuracy_meters::text in ('NaN', 'Infinity', '-Infinity')
    or p_accuracy_meters < 0 then
    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'gps_accuracy_too_low',
      'distance_meters', null,
      'verification_reason', 'A valid non-negative GPS accuracy is required.',
      'suspicious_flags', array['gps_accuracy_low']::text[]
    );
  end if;

  payload_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'event_id', p_event_id,
          'mode', p_mode,
          'device_timestamp', p_device_timestamp,
          'latitude', p_latitude,
          'longitude', p_longitude,
          'accuracy_meters', p_accuracy_meters,
          'photo_storage_path', p_photo_storage_path,
          'photo_hash', p_photo_hash,
          'qr_token', p_qr_token,
          'device_id', p_device_id,
          'local_id', p_local_id,
          'is_offline_submission', coalesce(p_is_offline_submission, false)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key, 0));

  select * into previous_sync
  from public.attendance_sync_records
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    if previous_sync.student_id <> student_record.student_id
      or previous_sync.event_id <> p_event_id
      or previous_sync.submission_mode is distinct from p_mode
      or previous_sync.payload_hash is distinct from payload_hash then
      return pg_catalog.jsonb_build_object(
        'accepted', false,
        'status', 'rejected',
        'distance_meters', null,
        'verification_reason', 'The idempotency key is already bound to a different attendance submission.',
        'suspicious_flags', array['duplicate_submission']::text[]
      );
    end if;

    if previous_sync.result is not null then
      return previous_sync.result;
    end if;

    return pg_catalog.jsonb_build_object(
      'accepted', false,
      'status', 'rejected',
      'distance_meters', null,
      'verification_reason', 'The idempotency key belongs to an incomplete legacy submission.',
      'suspicious_flags', array['duplicate_submission']::text[]
    );
  end if;

  -- Serialize all state transitions for one student/event pair, including
  -- submissions that use different idempotency keys and race before a row exists.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(student_record.student_id::text || ':' || p_event_id::text, 1)
  );

  <<validate_submission>>
  begin
    select * into event_record
    from public.events
    where id = p_event_id;

    if not found then
      return pg_catalog.jsonb_build_object(
        'accepted', false,
        'status', 'rejected',
        'distance_meters', null,
        'verification_reason', 'Event not found.',
        'suspicious_flags', array[]::text[]
      );
    end if;

    if event_record.deleted_at is not null then
      reason := 'Event not found.';
      exit validate_submission;
    end if;

    if event_record.status not in ('published', 'ongoing') then
      reason := 'This event is not currently eligible for attendance.';
      exit validate_submission;
    end if;

    select * into schedule_record
    from public.event_schedules
    where event_id = p_event_id;

    select * into location_record
    from public.event_locations
    where event_id = p_event_id;

    if schedule_record.id is null or location_record.id is null then
      reason := 'Event schedule or location is not configured.';
      exit validate_submission;
    end if;

    select
      not exists (
        select 1
        from public.event_participants ep
        where ep.event_id = p_event_id
      )
      or exists (
        select 1
        from public.event_participants ep
        where ep.event_id = p_event_id
          and (
            ep.target_type = 'student' and ep.student_id = student_record.student_id
            or ep.target_type = 'course' and ep.course_id = student_record.course_id
            or ep.target_type = 'section' and ep.section_id = student_record.section_id
            or ep.target_type = 'year_level' and ep.year_level = student_record.year_level
          )
      )
    into assignment_allowed;

    if not assignment_allowed then
      reason := 'Student is not assigned to this event.';
      exit validate_submission;
    end if;

    select * into device_record
    from public.devices
    where id = p_device_id
      and student_id = student_record.student_id
      and is_active = true;

    if not found then
      reason := 'Device is not active and registered to this student.';
      flags := pg_catalog.array_append(flags, 'device_mismatch');
      exit validate_submission;
    end if;

    if p_device_timestamp < server_now - interval '2 hours'
      or p_device_timestamp > server_now + interval '5 minutes' then
      reason := 'Device timestamp is outside the permitted two-hour age and five-minute future-skew window.';
      flags := pg_catalog.array_append(flags, 'offline_delay_exceeded');
      exit validate_submission;
    end if;

    if p_accuracy_meters > location_record.required_gps_accuracy_meters then
      resolved_status := 'gps_accuracy_too_low';
      reason := 'GPS accuracy is below the event requirement.';
      flags := pg_catalog.array_append(flags, 'gps_accuracy_low');
      exit validate_submission;
    end if;

    point_geog := public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326)::public.geography;
    point_geom := public.st_setsrid(public.st_makepoint(p_longitude, p_latitude), 4326);
    distance_meters := public.st_distance(point_geog, location_record.geog);

    select exists (
      select 1
      from public.event_zones z
      where z.event_id = p_event_id
    ) into has_zones;

    if has_zones then
      select exists (
        select 1
        from public.event_zones z
        where z.event_id = p_event_id
          and (
            z.zone_type = 'circle'
            and public.st_dwithin(
              point_geog,
              public.st_setsrid(public.st_makepoint(z.center_longitude, z.center_latitude), 4326)::public.geography,
              z.radius_meters
            )
            or z.zone_type = 'polygon' and public.st_covers(z.polygon, point_geom)
          )
      ) into is_inside;
    else
      is_inside := public.st_dwithin(point_geog, location_record.geog, location_record.radius_meters);
    end if;

    if not coalesce(is_inside, false) then
      resolved_status := 'outside_attendance_area';
      reason := 'Submitted location is outside the attendance zone.';
      flags := pg_catalog.array_append(flags, 'outside_zone');
      exit validate_submission;
    end if;

    if p_mode = 'time_in' then
      if server_now < schedule_record.check_in_opens_at
        or server_now > greatest(
          schedule_record.check_in_closes_at,
          coalesce(schedule_record.late_ends_at, schedule_record.check_in_closes_at)
        ) then
        reason := 'Server received check-in outside the allowed check-in or late period.';
        exit validate_submission;
      end if;
    else
      if schedule_record.check_out_opens_at is null or schedule_record.check_out_closes_at is null then
        reason := 'The event check-out window is not configured.';
        exit validate_submission;
      end if;

      if server_now < schedule_record.check_out_opens_at
        or server_now > schedule_record.check_out_closes_at then
        reason := 'Server received check-out outside the allowed check-out period.';
        exit validate_submission;
      end if;
    end if;

    if p_photo_storage_path is not null and p_photo_storage_path <> '' then
      path_parts := pg_catalog.string_to_array(p_photo_storage_path, '/');
      expected_filename := pg_catalog.cardinality(path_parts) = 3
        and path_parts[1] = caller_user_id::text
        and path_parts[2] = p_event_id::text
        and path_parts[3] in (
          p_local_id || '.jpg',
          p_local_id || '.jpeg',
          p_local_id || '.png',
          p_local_id || '.webp'
        );

      if not expected_filename then
        reason := 'Attendance photo path does not belong to this user, event, and local submission.';
        exit validate_submission;
      end if;

      select pg_catalog.to_jsonb(o) into storage_object
      from storage.objects o
      where o.bucket_id = 'attendance-evidence'
        and o.name = p_photo_storage_path
      limit 1;

      if storage_object is null then
        reason := 'Attendance photo evidence was not found in private storage.';
        exit validate_submission;
      end if;

      object_metadata := coalesce(storage_object -> 'metadata', '{}'::jsonb);
      object_mime_type := pg_catalog.lower(
        coalesce(object_metadata ->> 'mimetype', object_metadata ->> 'contentType', '')
      );
      object_size_text := object_metadata ->> 'size';

      if object_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
        reason := 'Attendance photo has an unsupported content type.';
        exit validate_submission;
      end if;

      if object_size_text is null or object_size_text !~ '^[0-9]+$' then
        reason := 'Attendance photo size metadata is missing or invalid.';
        exit validate_submission;
      end if;

      object_size := object_size_text::bigint;
      if object_size <= 0 or object_size > 5242880 then
        reason := 'Attendance photo must be between 1 byte and 5 MB.';
        exit validate_submission;
      end if;
    elsif (p_mode = 'time_in' and event_record.photo_required)
      or (p_mode = 'time_out' and event_record.time_out_photo_required) then
      reason := 'Required attendance photo evidence is missing.';
      exit validate_submission;
    end if;

    if event_record.dynamic_qr_required then
      if p_qr_token is null or p_qr_token = '' or not exists (
        select 1
        from public.event_qr_tokens token
        where token.event_id = p_event_id
          and token.token_hash = pg_catalog.encode(
            extensions.digest(pg_catalog.convert_to(p_qr_token, 'UTF8'), 'sha256'),
            'hex'
          )
          and token.expires_at >= server_now
      ) then
        reason := 'Dynamic QR token is invalid or expired.';
        flags := pg_catalog.array_append(flags, 'qr_invalid');
        exit validate_submission;
      end if;
    end if;

    if p_photo_hash is not null and exists (
      select 1
      from public.attendance_evidence evidence
      where evidence.photo_hash = p_photo_hash
    ) then
      flags := pg_catalog.array_append(flags, 'duplicate_photo');
    end if;

    select * into existing_session
    from public.attendance_sessions
    where event_id = p_event_id
      and student_id = student_record.student_id
    for update;

    if p_mode = 'time_in' then
      if existing_session.id is not null
        and (
          existing_session.time_in_verified_timestamp is not null
          or existing_session.time_out_verified_timestamp is not null
          or existing_session.reviewed_at is not null
          or existing_session.status in ('verified', 'completed', 'excused')
        ) then
        reason := 'A valid or reviewed time-in already exists for this event.';
        flags := pg_catalog.array_append(flags, 'duplicate_submission');
        exit validate_submission;
      end if;

      if exists (
        select 1
        from public.attendance_sessions other_session
        where other_session.student_id = student_record.student_id
          and other_session.local_id = p_local_id
          and other_session.event_id <> p_event_id
      ) then
        reason := 'Local attendance identifier is already used for another event.';
        flags := pg_catalog.array_append(flags, 'duplicate_submission');
        exit validate_submission;
      end if;

      resolved_status := case
        when schedule_record.late_ends_at is not null
          and schedule_record.late_ends_at > schedule_record.check_in_closes_at
          and server_now > schedule_record.check_in_closes_at
          and server_now <= schedule_record.late_ends_at then 'late'::public.attendance_status
        else 'time_in_recorded'::public.attendance_status
      end;
      reason := 'Time-in was accepted by authenticated server-side verification.';

      if existing_session.id is null then
        insert into public.attendance_sessions (
          local_id,
          event_id,
          student_id,
          status,
          time_in_device_timestamp,
          time_in_server_timestamp,
          time_in_verified_timestamp,
          time_in_latitude,
          time_in_longitude,
          time_in_accuracy,
          time_in_distance,
          time_in_photo_path,
          time_in_qr_token,
          verification_reason,
          suspicious_flags,
          device_id,
          is_offline_submission,
          sync_status
        ) values (
          p_local_id,
          p_event_id,
          student_record.student_id,
          resolved_status,
          p_device_timestamp,
          server_now,
          server_now,
          p_latitude,
          p_longitude,
          p_accuracy_meters,
          distance_meters,
          p_photo_storage_path,
          p_qr_token,
          reason,
          flags,
          p_device_id,
          coalesce(p_is_offline_submission, false),
          'pending_verification'
        )
        returning id into attendance_session_id;
      else
        update public.attendance_sessions
        set
          local_id = p_local_id,
          status = resolved_status,
          time_in_device_timestamp = p_device_timestamp,
          time_in_server_timestamp = server_now,
          time_in_verified_timestamp = server_now,
          time_in_latitude = p_latitude,
          time_in_longitude = p_longitude,
          time_in_accuracy = p_accuracy_meters,
          time_in_distance = distance_meters,
          time_in_photo_path = p_photo_storage_path,
          time_in_qr_token = p_qr_token,
          time_out_device_timestamp = null,
          time_out_server_timestamp = null,
          time_out_verified_timestamp = null,
          time_out_latitude = null,
          time_out_longitude = null,
          time_out_accuracy = null,
          time_out_distance = null,
          time_out_photo_path = null,
          time_out_qr_token = null,
          attendance_duration_minutes = null,
          verification_reason = reason,
          suspicious_flags = flags,
          device_id = p_device_id,
          is_offline_submission = coalesce(p_is_offline_submission, false),
          sync_status = 'pending_verification',
          reviewed_by = null,
          reviewed_at = null
        where id = existing_session.id
        returning id into attendance_session_id;
      end if;
    else
      if existing_session.id is null
        or existing_session.time_in_server_timestamp is null
        or not (
          existing_session.time_in_verified_timestamp is not null
          or existing_session.status = 'verified' and existing_session.reviewed_at is not null
        )
        or existing_session.status in ('rejected', 'excused', 'missed') then
        reason := 'A previously accepted time-in is required before check-out.';
        exit validate_submission;
      end if;

      if existing_session.time_out_verified_timestamp is not null
        or existing_session.status = 'completed' then
        reason := 'A valid check-out already exists for this event.';
        flags := pg_catalog.array_append(flags, 'duplicate_submission');
        exit validate_submission;
      end if;

      duration_minutes := pg_catalog.floor(
        extract(epoch from (server_now - existing_session.time_in_server_timestamp)) / 60
      );

      if not event_record.early_time_out_allowed
        and duration_minutes < event_record.minimum_attendance_minutes then
        reason := 'Minimum attendance duration has not been reached.';
        exit validate_submission;
      end if;

      resolved_status := 'completed';
      reason := 'Time-out was accepted by authenticated server-side verification.';

      update public.attendance_sessions
      set
        status = resolved_status,
        time_out_device_timestamp = p_device_timestamp,
        time_out_server_timestamp = server_now,
        time_out_verified_timestamp = server_now,
        time_out_latitude = p_latitude,
        time_out_longitude = p_longitude,
        time_out_accuracy = p_accuracy_meters,
        time_out_distance = distance_meters,
        time_out_photo_path = p_photo_storage_path,
        time_out_qr_token = p_qr_token,
        attendance_duration_minutes = duration_minutes,
        verification_reason = reason,
        suspicious_flags = pg_catalog.array_cat(suspicious_flags, flags),
        device_id = p_device_id,
        is_offline_submission = is_offline_submission or coalesce(p_is_offline_submission, false),
        sync_status = 'pending_verification'
      where id = existing_session.id
      returning id into attendance_session_id;
    end if;

    if p_photo_storage_path is not null and p_photo_storage_path <> '' then
      insert into public.attendance_evidence (
        attendance_session_id,
        evidence_type,
        storage_path,
        photo_hash,
        metadata
      ) values (
        attendance_session_id,
        case when p_mode = 'time_in' then 'time_in_photo' else 'time_out_photo' end,
        p_photo_storage_path,
        p_photo_hash,
        pg_catalog.jsonb_build_object(
          'latitude', p_latitude,
          'longitude', p_longitude,
          'accuracy_meters', p_accuracy_meters,
          'distance_meters', distance_meters,
          'device_timestamp', p_device_timestamp,
          'server_timestamp', server_now
        )
      );
    end if;

    accepted := true;
    result_sync_status := 'pending_verification';
  end validate_submission;

  result_payload := pg_catalog.jsonb_build_object(
    'accepted', accepted,
    'status', resolved_status,
    'distance_meters', distance_meters,
    'verification_reason', reason,
    'suspicious_flags', flags
  );

  insert into public.attendance_sync_records (
    attendance_session_id,
    local_id,
    idempotency_key,
    student_id,
    event_id,
    submission_mode,
    payload_hash,
    result,
    sync_status,
    last_error,
    uploaded_at,
    verified_at
  ) values (
    attendance_session_id,
    p_local_id,
    p_idempotency_key,
    student_record.student_id,
    p_event_id,
    p_mode,
    payload_hash,
    result_payload,
    result_sync_status,
    case when accepted then null else reason end,
    server_now,
    case when accepted then server_now else null end
  );

  return result_payload;
end;
$$;

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
    extensions.gen_random_uuid()::text;
  token_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(plaintext_token, 'UTF8'), 'sha256'),
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
      extensions.digest(pg_catalog.convert_to(new.time_in_qr_token, 'UTF8'), 'sha256'),
      'hex'
    );
  end if;

  if new.time_out_qr_token is not null
    and (tg_op = 'INSERT' or new.time_out_qr_token is distinct from old.time_out_qr_token)
    and new.time_out_qr_token not like 'sha256:%' then
    new.time_out_qr_token := 'sha256:' || pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(new.time_out_qr_token, 'UTF8'), 'sha256'),
      'hex'
    );
  end if;

  return new;
end;
$$;

-- Reassert the live ownership and least-privilege ACLs explicitly. CREATE OR
-- REPLACE preserves ACLs, but these statements make the intended state
-- deterministic across hosted and isolated environments.

alter function public.validate_qr_token(uuid, text) owner to postgres;
revoke all on function public.validate_qr_token(uuid, text)
  from public, anon, authenticated, service_role;
grant execute on function public.validate_qr_token(uuid, text)
  to service_role;

alter function public.submit_attendance_v2(
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
revoke all on function public.submit_attendance_v2(
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
) from public, anon, authenticated, service_role;
grant execute on function public.submit_attendance_v2(
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
) to authenticated, service_role;

alter function public.generate_event_qr_token(uuid, integer) owner to postgres;
revoke all on function public.generate_event_qr_token(uuid, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.generate_event_qr_token(uuid, integer)
  to authenticated, service_role;

alter function public.hash_new_attendance_qr_secrets() owner to postgres;
revoke all on function public.hash_new_attendance_qr_secrets()
  from public, anon, authenticated, service_role;
grant execute on function public.hash_new_attendance_qr_secrets()
  to service_role;
