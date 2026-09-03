insert into public.departments (id, name, code)
values
  ('00000000-0000-0000-0000-000000000101', 'College of Computer Studies', 'CCS'),
  ('00000000-0000-0000-0000-000000000102', 'College of Business', 'COB')
on conflict (id) do nothing;

insert into public.courses (id, department_id, name, code)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Bachelor of Science in Information Technology', 'BSIT'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000102', 'Bachelor of Science in Business Administration', 'BSBA')
on conflict (id) do nothing;

insert into public.sections (id, course_id, name, year_level)
values
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'IT-3A', 3),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000202', 'BA-2A', 2)
on conflict (id) do nothing;

insert into public.approved_student_roster (
  student_id,
  school_email,
  full_name,
  department_code,
  course_id,
  section_id,
  year_level,
  status
)
values (
  'TEST001',
  'test.student@csu.edu.ph',
  'Test Student',
  'CBEA',
  '00000000-0000-0000-0000-000000000202',
  '00000000-0000-0000-0000-000000000302',
  2,
  'eligible'
)
on conflict (student_id) do update set
  school_email = excluded.school_email,
  full_name = excluded.full_name,
  department_code = excluded.department_code,
  course_id = excluded.course_id,
  section_id = excluded.section_id,
  year_level = excluded.year_level,
  status = excluded.status;

insert into public.events (
  id,
  title,
  description,
  type,
  requirement,
  status,
  photo_required,
  time_out_photo_required,
  dynamic_qr_required,
  minimum_attendance_minutes,
  notification_schedule
)
values (
  '00000000-0000-0000-0000-000000000401',
  'Student Leadership Assembly',
  'Campus-wide assembly for student organization officers and class representatives.',
  'assembly',
  'required',
  'published',
  true,
  true,
  true,
  60,
  '["24h_before", "1h_before", "check_in_open"]'::jsonb
)
on conflict (id) do nothing;

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
values (
  '00000000-0000-0000-0000-000000000401',
  current_date + interval '7 day',
  (current_date + interval '7 day' + time '09:00')::timestamptz,
  (current_date + interval '7 day' + time '12:00')::timestamptz,
  (current_date + interval '7 day' + time '08:30')::timestamptz,
  (current_date + interval '7 day' + time '09:30')::timestamptz,
  (current_date + interval '7 day' + time '10:00')::timestamptz,
  (current_date + interval '7 day' + time '11:30')::timestamptz,
  (current_date + interval '7 day' + time '12:30')::timestamptz
)
on conflict (event_id) do nothing;

insert into public.event_locations (
  event_id,
  venue_name,
  address,
  latitude,
  longitude,
  radius_meters,
  required_gps_accuracy_meters
)
values (
  '00000000-0000-0000-0000-000000000401',
  'Main Auditorium',
  'Campus Main Building',
  14.5995,
  120.9842,
  100,
  40
)
on conflict (event_id) do nothing;

insert into public.event_participants (event_id, target_type, course_id)
values ('00000000-0000-0000-0000-000000000401', 'course', '00000000-0000-0000-0000-000000000201');

insert into public.announcements (title, description, importance, event_id)
values (
  'Leadership Assembly Reminder',
  'Bring your student ID and arrive during the check-in window.',
  'important',
  '00000000-0000-0000-0000-000000000401'
);
