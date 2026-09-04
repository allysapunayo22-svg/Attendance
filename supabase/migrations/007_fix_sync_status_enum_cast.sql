-- Migration 007: Fix enum casting for sync_status in verify_attendance_submission
-- Postgres 17 requires explicit casting of CASE expressions when assigning to enum columns.

create or replace function public.verify_attendance_submission(
  p_student_id uuid,
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
set search_path = public
as $$
declare
  event_record public.events%rowtype;
  schedule_record public.event_schedules%rowtype;
  location_record public.event_locations%rowtype;
  existing_session public.attendance_sessions%rowtype;
  inside_result record;
  resolved_status public.attendance_status := 'pending_verification';
  reason text := 'Attendance is pending administrator verification.';
  flags text[] := '{}';
  accepted boolean := true;
  server_now timestamptz := now();
  duration_minutes int;
  active_device_count int;
  qr_valid boolean := true;
  previous_submission record;
  travel_seconds double precision;
  travel_distance double precision;
begin
  select * into event_record from public.events where id = p_event_id and deleted_at is null;
  if event_record.id is null then
    return jsonb_build_object('accepted', false, 'status', 'rejected', 'distance_meters', null, 'verification_reason', 'Event not found.', 'suspicious_flags', array['outside_zone']);
  end if;

  select * into schedule_record from public.event_schedules where event_id = p_event_id;
  select * into location_record from public.event_locations where event_id = p_event_id;

  if schedule_record.id is null or location_record.id is null then
    return jsonb_build_object('accepted', false, 'status', 'rejected', 'distance_meters', null, 'verification_reason', 'Event schedule or location is not configured.', 'suspicious_flags', array['outside_zone']);
  end if;

  if not public.student_is_assigned_to_event(p_student_id, p_event_id) then
    return jsonb_build_object('accepted', false, 'status', 'rejected', 'distance_meters', null, 'verification_reason', 'Student is not assigned to this event.', 'suspicious_flags', array['duplicate_submission']);
  end if;

  if p_accuracy_meters > location_record.required_gps_accuracy_meters then
    accepted := false;
    resolved_status := 'gps_accuracy_too_low';
    reason := 'GPS accuracy is below the event requirement.';
    flags := array_append(flags, 'gps_accuracy_low');
  end if;

  select * into inside_result
  from public.event_point_is_inside_zone(p_event_id, p_latitude, p_longitude);

  if coalesce(inside_result.is_inside, false) = false then
    accepted := false;
    resolved_status := 'outside_attendance_area';
    reason := 'Submitted location is outside the attendance zone.';
    flags := array_append(flags, 'outside_zone');
  end if;

  if p_mode = 'time_in'
    and not (
      server_now between schedule_record.check_in_opens_at
      and greatest(schedule_record.check_in_closes_at, coalesce(schedule_record.late_ends_at, schedule_record.check_in_closes_at))
    ) then
    accepted := false;
    resolved_status := 'rejected';
    reason := 'Server received check-in outside the allowed check-in or late period.';
  end if;

  if p_mode = 'time_out' and schedule_record.check_out_opens_at is not null and schedule_record.check_out_closes_at is not null
    and not (server_now between schedule_record.check_out_opens_at and schedule_record.check_out_closes_at) then
    accepted := false;
    resolved_status := 'rejected';
    reason := 'Server received check-out outside the allowed check-out period.';
  end if;

  if event_record.photo_required and p_mode = 'time_in' and nullif(p_photo_storage_path, '') is null then
    accepted := false;
    resolved_status := 'pending_verification';
    reason := 'Required time-in photo evidence was not uploaded.';
  end if;

  if event_record.time_out_photo_required and p_mode = 'time_out' and nullif(p_photo_storage_path, '') is null then
    accepted := false;
    resolved_status := 'pending_verification';
    reason := 'Required time-out photo evidence was not uploaded.';
  end if;

  if event_record.dynamic_qr_required then
    qr_valid := public.validate_qr_token(p_event_id, p_qr_token);
    if not qr_valid then
      accepted := false;
      resolved_status := 'pending_verification';
      reason := 'Dynamic QR token is invalid or expired.';
      flags := array_append(flags, 'qr_invalid');
    end if;
  end if;

  if p_photo_hash is not null and exists (
    select 1
    from public.attendance_evidence
    where photo_hash = p_photo_hash
  ) then
    flags := array_append(flags, 'duplicate_photo');
  end if;

  select count(*) into active_device_count
  from public.devices
  where student_id = p_student_id and is_active = true;

  if active_device_count > 1 then
    flags := array_append(flags, 'same_device_multiple_accounts');
  end if;

  if p_is_offline_submission and server_now - p_device_timestamp > interval '2 hours' then
    flags := array_append(flags, 'offline_delay_exceeded');
  end if;

  select
    coalesce(time_out_latitude, time_in_latitude) as latitude,
    coalesce(time_out_longitude, time_in_longitude) as longitude,
    coalesce(time_out_server_timestamp, time_in_server_timestamp) as submitted_at
  into previous_submission
  from public.attendance_sessions
  where student_id = p_student_id
    and event_id <> p_event_id
    and coalesce(time_out_server_timestamp, time_in_server_timestamp) is not null
    and coalesce(time_out_latitude, time_in_latitude) is not null
    and coalesce(time_out_longitude, time_in_longitude) is not null
  order by coalesce(time_out_server_timestamp, time_in_server_timestamp) desc
  limit 1;

  if found and previous_submission.submitted_at is not null then
    travel_seconds := abs(extract(epoch from (server_now - previous_submission.submitted_at)));
    travel_distance := st_distance(
      st_setsrid(st_makepoint(previous_submission.longitude, previous_submission.latitude), 4326)::geography,
      st_setsrid(st_makepoint(p_longitude, p_latitude), 4326)::geography
    );

    if travel_seconds > 0 and travel_distance / travel_seconds > 50 then
      flags := array_append(flags, 'impossible_travel');
    end if;
  end if;

  insert into public.attendance_sync_records (
    local_id,
    idempotency_key,
    student_id,
    event_id,
    sync_status
  )
  values (
    p_local_id,
    p_idempotency_key,
    p_student_id,
    p_event_id,
    'uploaded'
  )
  on conflict (idempotency_key) do update
    set retry_count = public.attendance_sync_records.retry_count + 1,
        submitted_at = excluded.submitted_at
  returning attendance_session_id into existing_session.id;

  select * into existing_session
  from public.attendance_sessions
  where event_id = p_event_id and student_id = p_student_id;

  if p_mode = 'time_in' then
    if accepted then
      resolved_status := case
        when schedule_record.late_ends_at is not null
          and schedule_record.late_ends_at > schedule_record.check_in_closes_at
          and server_now > schedule_record.check_in_closes_at
          and server_now <= schedule_record.late_ends_at then 'late'
        else 'time_in_recorded'
      end;
      reason := 'Time-in was accepted by server-side location and schedule checks.';
    end if;

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
    )
    values (
      p_local_id,
      p_event_id,
      p_student_id,
      resolved_status,
      p_device_timestamp,
      server_now,
      case when accepted then server_now else null end,
      p_latitude,
      p_longitude,
      p_accuracy_meters,
      inside_result.distance_meters,
      p_photo_storage_path,
      p_qr_token,
      reason,
      flags,
      p_device_id,
      p_is_offline_submission,
      case when accepted then 'pending_verification'::public.sync_status else 'requires_review'::public.sync_status end
    )
    on conflict (event_id, student_id) do update set
      local_id = coalesce(public.attendance_sessions.local_id, excluded.local_id),
      status = excluded.status,
      time_in_device_timestamp = coalesce(public.attendance_sessions.time_in_device_timestamp, excluded.time_in_device_timestamp),
      time_in_server_timestamp = coalesce(public.attendance_sessions.time_in_server_timestamp, excluded.time_in_server_timestamp),
      time_in_verified_timestamp = coalesce(public.attendance_sessions.time_in_verified_timestamp, excluded.time_in_verified_timestamp),
      time_in_latitude = coalesce(public.attendance_sessions.time_in_latitude, excluded.time_in_latitude),
      time_in_longitude = coalesce(public.attendance_sessions.time_in_longitude, excluded.time_in_longitude),
      time_in_accuracy = coalesce(public.attendance_sessions.time_in_accuracy, excluded.time_in_accuracy),
      time_in_distance = coalesce(public.attendance_sessions.time_in_distance, excluded.time_in_distance),
      time_in_photo_path = coalesce(public.attendance_sessions.time_in_photo_path, excluded.time_in_photo_path),
      time_in_qr_token = coalesce(public.attendance_sessions.time_in_qr_token, excluded.time_in_qr_token),
      verification_reason = excluded.verification_reason,
      suspicious_flags = array_cat(public.attendance_sessions.suspicious_flags, excluded.suspicious_flags),
      device_id = excluded.device_id,
      is_offline_submission = public.attendance_sessions.is_offline_submission or excluded.is_offline_submission,
      sync_status = excluded.sync_status
    returning * into existing_session;
  else
    if existing_session.id is null or existing_session.time_in_server_timestamp is null then
      accepted := false;
      resolved_status := 'rejected';
      reason := 'Cannot check out before a valid time-in.';
    elsif accepted then
      duration_minutes := floor(extract(epoch from (server_now - existing_session.time_in_server_timestamp)) / 60);
      if not event_record.early_time_out_allowed and duration_minutes < event_record.minimum_attendance_minutes then
        accepted := false;
        resolved_status := 'pending_verification';
        reason := 'Time-out is earlier than the minimum attendance duration.';
      else
        resolved_status := 'completed';
        reason := 'Time-out was accepted by server-side verification.';
      end if;
    end if;

    update public.attendance_sessions
    set
      status = resolved_status,
      time_out_device_timestamp = p_device_timestamp,
      time_out_server_timestamp = server_now,
      time_out_verified_timestamp = case when accepted then server_now else null end,
      time_out_latitude = p_latitude,
      time_out_longitude = p_longitude,
      time_out_accuracy = p_accuracy_meters,
      time_out_distance = inside_result.distance_meters,
      time_out_photo_path = p_photo_storage_path,
      time_out_qr_token = p_qr_token,
      attendance_duration_minutes = case
        when time_in_server_timestamp is null then null
        else floor(extract(epoch from (server_now - time_in_server_timestamp)) / 60)
      end,
      verification_reason = reason,
      suspicious_flags = array_cat(suspicious_flags, flags),
      sync_status = case when accepted then 'pending_verification'::public.sync_status else 'requires_review'::public.sync_status end
    where id = existing_session.id
    returning * into existing_session;
  end if;

  update public.attendance_sync_records
  set attendance_session_id = existing_session.id,
      sync_status = existing_session.sync_status,
      uploaded_at = server_now,
      verified_at = case when accepted then server_now else null end
  where idempotency_key = p_idempotency_key;

  insert into public.attendance_evidence(attendance_session_id, evidence_type, storage_path, photo_hash, metadata)
  values (
    existing_session.id,
    case when p_mode = 'time_in' then 'time_in_photo' else 'time_out_photo' end,
    p_photo_storage_path,
    p_photo_hash,
    jsonb_build_object(
      'latitude', p_latitude,
      'longitude', p_longitude,
      'accuracy_meters', p_accuracy_meters,
      'distance_meters', inside_result.distance_meters,
      'device_timestamp', p_device_timestamp,
      'server_timestamp', server_now
    )
  );

  return jsonb_build_object(
    'accepted', accepted,
    'status', resolved_status,
    'distance_meters', inside_result.distance_meters,
    'verification_reason', reason,
    'suspicious_flags', flags
  );
end;
$$;
