-- Migration 008: Harden student-facing event and announcement visibility.
--
-- These helpers return authorization decisions only. They run as the function
-- owner so policy checks can inspect targeting rows without granting students
-- direct access to event_participants or announcement_recipients.

create or replace function public.student_can_access_event(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.users u
    join public.student_profiles sp on sp.user_id = u.id
    join public.events e on e.id = p_event_id
    where u.id = auth.uid()
      and u.role = 'student'::public.user_role
      and u.is_active = true
      and sp.is_active = true
      and e.status in ('published', 'ongoing', 'completed', 'cancelled')
      and e.deleted_at is null
      and (
        not exists (
          select 1
          from public.event_participants ep
          where ep.event_id = e.id
        )
        or exists (
          select 1
          from public.event_participants ep
          where ep.event_id = e.id
            and (
              ep.target_type = 'student' and ep.student_id = sp.id
              or ep.target_type = 'course' and ep.course_id = sp.course_id
              or ep.target_type = 'section' and ep.section_id = sp.section_id
              or ep.target_type = 'year_level' and ep.year_level = sp.year_level
            )
        )
      )
  );
$$;

alter function public.student_can_access_event(uuid) owner to postgres;
revoke all on function public.student_can_access_event(uuid) from public;
grant execute on function public.student_can_access_event(uuid) to anon, authenticated;

comment on function public.student_can_access_event(uuid) is
  'Returns whether the current authenticated active student may read one visible event.';

create or replace function public.student_can_access_announcement(p_announcement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.users u
    join public.student_profiles sp on sp.user_id = u.id
    join public.announcements a on a.id = p_announcement_id
    where u.id = auth.uid()
      and u.role = 'student'::public.user_role
      and u.is_active = true
      and sp.is_active = true
      and a.publish_at <= pg_catalog.now()
      and (
        not exists (
          select 1
          from public.announcement_recipients ar
          where ar.announcement_id = a.id
        )
        or exists (
          select 1
          from public.announcement_recipients ar
          where ar.announcement_id = a.id
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
$$;

alter function public.student_can_access_announcement(uuid) owner to postgres;
revoke all on function public.student_can_access_announcement(uuid) from public;
grant execute on function public.student_can_access_announcement(uuid) to anon, authenticated;

comment on function public.student_can_access_announcement(uuid) is
  'Returns whether the current authenticated active student may read one published announcement.';

drop policy if exists "students read assigned published events" on public.events;
create policy "students read assigned published events" on public.events
  for select using (
    public.is_admin()
    or case
      when auth.uid() is null then false
      else public.student_can_access_event(id)
    end
  );

drop policy if exists "students read assigned event schedules" on public.event_schedules;
create policy "students read assigned event schedules" on public.event_schedules
  for select using (
    public.is_admin()
    or case
      when auth.uid() is null then false
      else public.student_can_access_event(event_id)
    end
  );

drop policy if exists "students read assigned event locations" on public.event_locations;
create policy "students read assigned event locations" on public.event_locations
  for select using (
    public.is_admin()
    or case
      when auth.uid() is null then false
      else public.student_can_access_event(event_id)
    end
  );

drop policy if exists "students read assigned event zones" on public.event_zones;
create policy "students read assigned event zones" on public.event_zones
  for select using (
    public.is_admin()
    or case
      when auth.uid() is null then false
      else public.student_can_access_event(event_id)
    end
  );

drop policy if exists "students read assigned announcements" on public.announcements;
create policy "students read assigned announcements" on public.announcements
  for select using (
    public.is_admin()
    or case
      when auth.uid() is null then false
      else public.student_can_access_announcement(id)
    end
  );
