\set ON_ERROR_STOP on

begin;

grant select on all tables in schema public to authenticated;
grant update (read_at) on public.notifications to authenticated;

create function public._phase_2a_assert(p_label text, p_condition boolean)
returns void
language plpgsql
as $test$
begin
  if coalesce(p_condition, false) is not true then
    raise exception 'Phase 2A assertion failed: %', p_label;
  end if;
  raise notice 'PASS: %', p_label;
end;
$test$;

grant execute on function public._phase_2a_assert(text, boolean) to authenticated;

insert into auth.users (id, email) values
  ('71000000-0000-0000-0000-000000000001', 'phase2a-one@test.invalid'),
  ('71000000-0000-0000-0000-000000000002', 'phase2a-two@test.invalid'),
  ('7a000000-0000-0000-0000-000000000001', 'phase2a-admin@test.invalid');

insert into public.users (id, role, email, full_name, is_active) values
  ('71000000-0000-0000-0000-000000000001', 'student', 'phase2a-one@test.invalid', 'Phase 2A Student One', true),
  ('71000000-0000-0000-0000-000000000002', 'student', 'phase2a-two@test.invalid', 'Phase 2A Student Two', true),
  ('7a000000-0000-0000-0000-000000000001', 'admin', 'phase2a-admin@test.invalid', 'Phase 2A Admin', true);

insert into public.student_profiles (id, user_id, student_id, full_name, email, is_active) values
  ('72000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'PHASE2A-1', 'Phase 2A Student One', 'phase2a-one@test.invalid', true),
  ('72000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'PHASE2A-2', 'Phase 2A Student Two', 'phase2a-two@test.invalid', true);

insert into public.admin_profiles (id, user_id, full_name, email) values
  ('72000000-0000-0000-0000-000000000003', '7a000000-0000-0000-0000-000000000001', 'Phase 2A Admin', 'phase2a-admin@test.invalid');

insert into public.events (id, title, description, status)
values ('73000000-0000-0000-0000-000000000001', 'Phase 2A Event', 'Rollback-only RLS fixture.', 'published');

insert into public.attendance_sessions (id, event_id, student_id, status) values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'verified'),
  ('74000000-0000-0000-0000-000000000002', '73000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000002', 'late');

insert into public.notifications (id, user_id, type, title, body) values
  ('75000000-0000-0000-0000-000000000001', '71000000-0000-0000-0000-000000000001', 'attendance_verified', 'Student one', 'Owned by student one.'),
  ('75000000-0000-0000-0000-000000000002', '71000000-0000-0000-0000-000000000002', 'attendance_verified', 'Student two', 'Owned by student two.');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);
select public._phase_2a_assert('student reads exactly one own profile', (select count(*) = 1 from public.student_profiles));
select public._phase_2a_assert('student cannot read another profile by id', (select count(*) = 0 from public.student_profiles where id = '72000000-0000-0000-0000-000000000002'));
select public._phase_2a_assert('student reads exactly one own attendance record', (select count(*) = 1 from public.attendance_sessions));
select public._phase_2a_assert('student cannot read another attendance record by URL id', (select count(*) = 0 from public.attendance_sessions where id = '74000000-0000-0000-0000-000000000002'));
select public._phase_2a_assert('student reads exactly one own notification', (select count(*) = 1 from public.notifications));
update public.notifications set read_at = now() where id in ('75000000-0000-0000-0000-000000000001', '75000000-0000-0000-0000-000000000002');
select public._phase_2a_assert('student can mark own notification read', (select read_at is not null from public.notifications where id = '75000000-0000-0000-0000-000000000001'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true);
select public._phase_2a_assert('another student notification was not modified', (select read_at is null from public.notifications where id = '75000000-0000-0000-0000-000000000002'));
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '7a000000-0000-0000-0000-000000000001', true);
select public._phase_2a_assert('admin retains attendance access', (select count(*) = 2 from public.attendance_sessions));
reset role;

rollback;
