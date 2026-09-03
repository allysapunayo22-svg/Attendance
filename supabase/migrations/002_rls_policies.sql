alter table public.users enable row level security;
alter table public.departments enable row level security;
alter table public.courses enable row level security;
alter table public.sections enable row level security;
alter table public.student_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.events enable row level security;
alter table public.event_schedules enable row level security;
alter table public.event_locations enable row level security;
alter table public.event_zones enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_qr_tokens enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_evidence enable row level security;
alter table public.attendance_sync_records enable row level security;
alter table public.attendance_reviews enable row level security;
alter table public.absence_requests enable row level security;
alter table public.appeals enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_recipients enable row level security;
alter table public.devices enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'super_admin'), false)
$$;

create or replace function public.current_student_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.student_profiles where user_id = auth.uid()
$$;

create or replace function public.current_admin_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.admin_profiles where user_id = auth.uid()
$$;

create or replace function public.student_is_assigned_to_event(p_student_id uuid, p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with student as (
    select sp.id, sp.course_id, sp.section_id, sp.year_level
    from public.student_profiles sp
    where sp.id = p_student_id and sp.is_active = true
  )
  select exists (
    select 1
    from public.event_participants ep
    join student s on true
    where ep.event_id = p_event_id
      and (
        ep.target_type = 'student' and ep.student_id = s.id
        or ep.target_type = 'course' and ep.course_id = s.course_id
        or ep.target_type = 'section' and ep.section_id = s.section_id
        or ep.target_type = 'year_level' and ep.year_level = s.year_level
      )
  )
  or not exists (select 1 from public.event_participants where event_id = p_event_id);
$$;

create policy "users can read themselves" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "students can read own profile" on public.student_profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy "admins manage student profiles" on public.student_profiles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins can read admin profiles" on public.admin_profiles
  for select using (public.is_admin() or user_id = auth.uid());

create policy "admins manage departments" on public.departments
  for all using (public.is_admin()) with check (public.is_admin());
create policy "students read departments" on public.departments
  for select using (auth.uid() is not null);

create policy "admins manage courses" on public.courses
  for all using (public.is_admin()) with check (public.is_admin());
create policy "students read courses" on public.courses
  for select using (auth.uid() is not null);

create policy "admins manage sections" on public.sections
  for all using (public.is_admin()) with check (public.is_admin());
create policy "students read sections" on public.sections
  for select using (auth.uid() is not null);

create policy "students read own enrollments" on public.enrollments
  for select using (student_id = public.current_student_profile_id() or public.is_admin());
create policy "admins manage enrollments" on public.enrollments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read assigned published events" on public.events
  for select using (
    public.is_admin()
    or (
      status in ('published', 'ongoing', 'completed', 'cancelled')
      and deleted_at is null
      and public.student_is_assigned_to_event(public.current_student_profile_id(), id)
    )
  );

create policy "admins manage events" on public.events
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read assigned event schedules" on public.event_schedules
  for select using (
    public.is_admin()
    or public.student_is_assigned_to_event(public.current_student_profile_id(), event_id)
  );
create policy "admins manage event schedules" on public.event_schedules
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read assigned event locations" on public.event_locations
  for select using (
    public.is_admin()
    or public.student_is_assigned_to_event(public.current_student_profile_id(), event_id)
  );
create policy "admins manage event locations" on public.event_locations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read assigned event zones" on public.event_zones
  for select using (
    public.is_admin()
    or public.student_is_assigned_to_event(public.current_student_profile_id(), event_id)
  );
create policy "admins manage event zones" on public.event_zones
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage participants" on public.event_participants
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read own registrations" on public.event_registrations
  for select using (student_id = public.current_student_profile_id() or public.is_admin());
create policy "students register themselves" on public.event_registrations
  for insert with check (student_id = public.current_student_profile_id());
create policy "admins manage registrations" on public.event_registrations
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage qr tokens" on public.event_qr_tokens
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read own attendance" on public.attendance_sessions
  for select using (student_id = public.current_student_profile_id() or public.is_admin());
create policy "admins manage attendance" on public.attendance_sessions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read own attendance evidence" on public.attendance_evidence
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.attendance_sessions s
      where s.id = attendance_session_id
      and s.student_id = public.current_student_profile_id()
    )
  );
create policy "admins manage evidence" on public.attendance_evidence
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read own sync records" on public.attendance_sync_records
  for select using (student_id = public.current_student_profile_id() or public.is_admin());
create policy "admins manage sync records" on public.attendance_sync_records
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage reviews" on public.attendance_reviews
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students manage own absence requests" on public.absence_requests
  for all using (student_id = public.current_student_profile_id())
  with check (student_id = public.current_student_profile_id());
create policy "admins manage absence requests" on public.absence_requests
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students manage own appeals" on public.appeals
  for all using (student_id = public.current_student_profile_id())
  with check (student_id = public.current_student_profile_id());
create policy "admins manage appeals" on public.appeals
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read assigned announcements" on public.announcements
  for select using (
    public.is_admin()
    or publish_at <= now()
    and (
      not exists (select 1 from public.announcement_recipients ar where ar.announcement_id = announcements.id)
      or exists (
        select 1
        from public.announcement_recipients ar
        join public.student_profiles sp on sp.id = public.current_student_profile_id()
        where ar.announcement_id = announcements.id
          and (
            ar.target_type = 'all'
            or ar.target_type = 'student' and ar.student_id = sp.id
            or ar.target_type = 'course' and ar.course_id = sp.course_id
            or ar.target_type = 'section' and ar.section_id = sp.section_id
            or ar.target_type = 'year_level' and ar.year_level = sp.year_level
          )
      )
    )
  );
create policy "admins manage announcements" on public.announcements
  for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage announcement recipients" on public.announcement_recipients
  for all using (public.is_admin()) with check (public.is_admin());

create policy "students read own devices" on public.devices
  for select using (student_id = public.current_student_profile_id() or public.is_admin());
create policy "students register own devices" on public.devices
  for insert with check (student_id = public.current_student_profile_id());
create policy "students update own devices" on public.devices
  for update using (student_id = public.current_student_profile_id())
  with check (student_id = public.current_student_profile_id());
create policy "admins manage devices" on public.devices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "users manage own push tokens" on public.push_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read push tokens" on public.push_tokens
  for select using (public.is_admin());

create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());
create policy "users update own notification read state" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins manage notifications" on public.notifications
  for all using (public.is_admin()) with check (public.is_admin());

create policy "admins read audit logs" on public.audit_logs
  for select using (public.is_admin());

create policy "students upload own evidence" on storage.objects
  for insert with check (
    bucket_id = 'attendance-evidence'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "students read own evidence files" on storage.objects
  for select using (
    bucket_id = 'attendance-evidence'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

create policy "admins manage event banners" on storage.objects
  for all using (bucket_id = 'event-banners' and public.is_admin())
  with check (bucket_id = 'event-banners' and public.is_admin());

create policy "public reads event banners" on storage.objects
  for select using (bucket_id = 'event-banners');

create policy "students upload appeal documents" on storage.objects
  for insert with check (
    bucket_id = 'appeal-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "students and admins read appeal documents" on storage.objects
  for select using (
    bucket_id = 'appeal-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );
