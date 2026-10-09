\set ON_ERROR_STOP on

begin;

-- Supabase grants API roles table privileges separately from RLS policies.
-- The isolated PostgreSQL harness mirrors those grants for this rollback-only test.
grant select on all tables in schema public to anon, authenticated;

create function public._rls_assert(p_label text, p_condition boolean)
returns void
language plpgsql
as $test$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'RLS assertion failed: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$test$;

grant execute on function public._rls_assert(text, boolean) to anon, authenticated;

insert into public.departments (id, name, code)
values ('30000000-0000-0000-0000-000000000000', 'Test Department', 'RLS-T');

insert into public.courses (id, department_id, name, code)
values (
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000000',
  'RLS Test Course',
  'RLS-C'
);

insert into public.sections (id, course_id, name, year_level)
values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'RLS Test Section',
  1
);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-000000000001', 'assigned@test.invalid'),
  ('10000000-0000-0000-0000-000000000002', 'unrestricted@test.invalid'),
  ('10000000-0000-0000-0000-000000000003', 'unassigned@test.invalid'),
  ('10000000-0000-0000-0000-000000000004', 'inactive-account@test.invalid'),
  ('10000000-0000-0000-0000-000000000005', 'inactive-profile@test.invalid'),
  ('a0000000-0000-0000-0000-000000000001', 'admin@test.invalid'),
  ('b0000000-0000-0000-0000-000000000001', 'super-admin@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'student', 'assigned@test.invalid', 'Assigned Student', true),
  ('10000000-0000-0000-0000-000000000002', 'student', 'unrestricted@test.invalid', 'Unrestricted Student', true),
  ('10000000-0000-0000-0000-000000000003', 'student', 'unassigned@test.invalid', 'Unassigned Student', true),
  ('10000000-0000-0000-0000-000000000004', 'student', 'inactive-account@test.invalid', 'Inactive Account', false),
  ('10000000-0000-0000-0000-000000000005', 'student', 'inactive-profile@test.invalid', 'Inactive Profile', true),
  ('a0000000-0000-0000-0000-000000000001', 'admin', 'admin@test.invalid', 'Test Admin', true),
  ('b0000000-0000-0000-0000-000000000001', 'super_admin', 'super-admin@test.invalid', 'Test Super Admin', true);

insert into public.student_profiles (
  id, user_id, student_id, full_name, email, course_id, section_id, year_level, is_active
) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'RLS-001', 'Assigned Student', 'assigned@test.invalid', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'RLS-002', 'Unrestricted Student', 'unrestricted@test.invalid', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'RLS-003', 'Unassigned Student', 'unassigned@test.invalid', null, null, 2, true),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'RLS-004', 'Inactive Account', 'inactive-account@test.invalid', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005', 'RLS-005', 'Inactive Profile', 'inactive-profile@test.invalid', '30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, false);

insert into public.admin_profiles (id, user_id, full_name, email) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Test Admin', 'admin@test.invalid'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Test Super Admin', 'super-admin@test.invalid');

insert into public.events (id, title, description, status, deleted_at) values
  ('e0000000-0000-0000-0000-000000000001', 'Unrestricted Published', 'No participant rows.', 'published', null),
  ('e0000000-0000-0000-0000-000000000002', 'Restricted Published', 'Assigned only to RLS-001.', 'published', null),
  ('e0000000-0000-0000-0000-000000000003', 'Unrestricted Draft', 'Not student-visible.', 'draft', null),
  ('e0000000-0000-0000-0000-000000000004', 'Deleted Published', 'Not student-visible.', 'published', now());

insert into public.event_participants (id, event_id, target_type, student_id)
values (
  '54000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'student',
  '20000000-0000-0000-0000-000000000001'
);

insert into public.event_schedules (
  id, event_id, event_date, starts_at, ends_at, check_in_opens_at, check_in_closes_at
) values
  ('51000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '2026-10-05', '2026-10-05 08:00+08', '2026-10-05 10:00+08', '2026-10-05 07:30+08', '2026-10-05 08:30+08'),
  ('51000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '2026-10-05', '2026-10-05 08:00+08', '2026-10-05 10:00+08', '2026-10-05 07:30+08', '2026-10-05 08:30+08'),
  ('51000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', '2026-10-05', '2026-10-05 08:00+08', '2026-10-05 10:00+08', '2026-10-05 07:30+08', '2026-10-05 08:30+08'),
  ('51000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', '2026-10-05', '2026-10-05 08:00+08', '2026-10-05 10:00+08', '2026-10-05 07:30+08', '2026-10-05 08:30+08');

insert into public.event_locations (
  id, event_id, venue_name, latitude, longitude, radius_meters, required_gps_accuracy_meters
) values
  ('52000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Venue 1', 18.265, 121.995, 100, 50),
  ('52000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Venue 2', 18.265, 121.995, 100, 50),
  ('52000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Venue 3', 18.265, 121.995, 100, 50),
  ('52000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Venue 4', 18.265, 121.995, 100, 50);

insert into public.event_zones (
  id, event_id, name, zone_type, center_latitude, center_longitude, radius_meters
) values
  ('53000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Zone 1', 'circle', 18.265, 121.995, 100),
  ('53000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'Zone 2', 'circle', 18.265, 121.995, 100),
  ('53000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'Zone 3', 'circle', 18.265, 121.995, 100),
  ('53000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', 'Zone 4', 'circle', 18.265, 121.995, 100);

insert into public.announcements (id, title, description, publish_at) values
  ('60000000-0000-0000-0000-000000000001', 'Global', 'No recipient rows.', now() - interval '1 hour'),
  ('60000000-0000-0000-0000-000000000002', 'Assigned Student Only', 'Targeted to RLS-001.', now() - interval '1 hour'),
  ('60000000-0000-0000-0000-000000000003', 'Unrestricted Student Only', 'Targeted to RLS-002.', now() - interval '1 hour'),
  ('60000000-0000-0000-0000-000000000004', 'Future Global', 'Not published yet.', now() + interval '1 day');

insert into public.announcement_recipients (id, announcement_id, target_type, student_id) values
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002', 'student', '20000000-0000-0000-0000-000000000001'),
  ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', 'student', '20000000-0000-0000-0000-000000000002');

-- A. Anonymous user.
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select public._rls_assert('anonymous cannot read events', (select count(*) = 0 from public.events));
select public._rls_assert('anonymous cannot read schedules', (select count(*) = 0 from public.event_schedules));
select public._rls_assert('anonymous cannot read locations', (select count(*) = 0 from public.event_locations));
select public._rls_assert('anonymous cannot read zones', (select count(*) = 0 from public.event_zones));
select public._rls_assert('anonymous cannot read announcements', (select count(*) = 0 from public.announcements));
select public._rls_assert('anonymous event helper returns false', not public.student_can_access_event('e0000000-0000-0000-0000-000000000001'));
select public._rls_assert('anonymous announcement helper returns false', not public.student_can_access_announcement('60000000-0000-0000-0000-000000000001'));
reset role;

-- B. Active assigned student.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select public._rls_assert('assigned student sees unrestricted and assigned events', (
  select array_agg(id order by id) = array[
    'e0000000-0000-0000-0000-000000000001'::uuid,
    'e0000000-0000-0000-0000-000000000002'::uuid
  ] from public.events
));
select public._rls_assert('assigned student sees only visible schedules', (select count(*) = 2 from public.event_schedules));
select public._rls_assert('assigned student sees only visible locations', (select count(*) = 2 from public.event_locations));
select public._rls_assert('assigned student sees only visible zones', (select count(*) = 2 from public.event_zones));
select public._rls_assert('assigned student sees global and own targeted announcement', (
  select array_agg(id order by id) = array[
    '60000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000002'::uuid
  ] from public.announcements
));
select public._rls_assert('student cannot read recipient rows directly', (select count(*) = 0 from public.announcement_recipients));
reset role;

-- C. Active student on an event with no participant restrictions.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select public._rls_assert('active student sees unrestricted event', (
  select array_agg(id order by id) = array['e0000000-0000-0000-0000-000000000001'::uuid]
  from public.events
));
select public._rls_assert('active student sees own targeted announcement only', (
  select array_agg(id order by id) = array[
    '60000000-0000-0000-0000-000000000001'::uuid,
    '60000000-0000-0000-0000-000000000003'::uuid
  ] from public.announcements
));
reset role;

-- D. Active unassigned student where restrictions exist.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select public._rls_assert('unassigned student cannot read restricted event', (
  select array_agg(id order by id) = array['e0000000-0000-0000-0000-000000000001'::uuid]
  from public.events
));
select public._rls_assert('restricted schedule does not leak', (select count(*) = 1 from public.event_schedules));
select public._rls_assert('restricted location does not leak', (select count(*) = 1 from public.event_locations));
select public._rls_assert('restricted zone does not leak', (select count(*) = 1 from public.event_zones));
select public._rls_assert('other students targeted announcements do not leak', (
  select array_agg(id order by id) = array['60000000-0000-0000-0000-000000000001'::uuid]
  from public.announcements
));
reset role;

-- E. Inactive student account and inactive student profile.
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select public._rls_assert('inactive account cannot read events', (select count(*) = 0 from public.events));
select public._rls_assert('inactive account cannot read announcements', (select count(*) = 0 from public.announcements));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select public._rls_assert('inactive profile cannot read events', (select count(*) = 0 from public.events));
select public._rls_assert('inactive profile cannot read announcements', (select count(*) = 0 from public.announcements));
reset role;

-- F. Admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);
select public._rls_assert('admin retains full event access', (select count(*) = 4 from public.events));
select public._rls_assert('admin retains schedule access', (select count(*) = 4 from public.event_schedules));
select public._rls_assert('admin retains location access', (select count(*) = 4 from public.event_locations));
select public._rls_assert('admin retains zone access', (select count(*) = 4 from public.event_zones));
select public._rls_assert('admin retains announcement access', (select count(*) = 4 from public.announcements));
select public._rls_assert('admin retains recipient access', (select count(*) = 2 from public.announcement_recipients));
reset role;

-- G. Super admin.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', true);
select public._rls_assert('super admin retains full event access', (select count(*) = 4 from public.events));
select public._rls_assert('super admin retains child access', (
  (select count(*) = 4 from public.event_schedules)
  and (select count(*) = 4 from public.event_locations)
  and (select count(*) = 4 from public.event_zones)
));
select public._rls_assert('super admin retains announcement access', (select count(*) = 4 from public.announcements));
reset role;

rollback;
