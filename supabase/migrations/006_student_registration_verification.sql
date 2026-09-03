create or replace function public.normalize_student_id(p_student_id text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(p_student_id, '')), '\s+', '', 'g'))
$$;

create table if not exists public.approved_student_roster (
  student_id text primary key,
  school_email text not null unique,
  full_name text not null,
  department_code text not null default 'CBEA' check (department_code = 'CBEA'),
  course_id uuid references public.courses(id) on delete set null,
  section_id uuid references public.sections(id) on delete set null,
  year_level int check (year_level is null or year_level between 1 and 6),
  status text not null default 'eligible' check (status in ('eligible', 'inactive', 'graduated', 'blocked')),
  claimed_by_user_id uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (student_id = public.normalize_student_id(student_id)),
  check (school_email = lower(trim(school_email)))
);

create table if not exists public.student_registration_requests (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  student_id text not null,
  school_email text not null,
  full_name text not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'needs_admin_review')),
  reason text,
  id_document_path text,
  reviewed_by uuid references public.admin_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_approved_student_roster_email on public.approved_student_roster(school_email);
create index if not exists idx_approved_student_roster_status on public.approved_student_roster(status, department_code);
create index if not exists idx_student_registration_requests_status on public.student_registration_requests(status, created_at desc);

create or replace function public.upsert_student_registration_request(
  p_auth_user_id uuid,
  p_student_id text,
  p_school_email text,
  p_full_name text,
  p_status text,
  p_reason text
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.student_registration_requests (
    auth_user_id,
    student_id,
    school_email,
    full_name,
    status,
    reason
  )
  values (
    p_auth_user_id,
    p_student_id,
    p_school_email,
    p_full_name,
    p_status,
    p_reason
  )
  on conflict (auth_user_id) do update set
    student_id = excluded.student_id,
    school_email = excluded.school_email,
    full_name = excluded.full_name,
    status = excluded.status,
    reason = excluded.reason,
    updated_at = now();
$$;

create or replace function public.complete_verified_student_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_student_id text := public.normalize_student_id(new.raw_user_meta_data ->> 'student_id');
  requested_email text := lower(trim(coalesce(new.email, '')));
  requested_full_name text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  roster_record public.approved_student_roster%rowtype;
  existing_profile_id uuid;
begin
  if requested_student_id = '' then
    return new;
  end if;

  if requested_email = '' then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      coalesce(requested_full_name, 'Student'),
      'rejected',
      'A school email address is required.'
    );
    return new;
  end if;

  if new.email_confirmed_at is null then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      coalesce(requested_full_name, 'Student'),
      'submitted',
      'Waiting for school email confirmation.'
    );
    return new;
  end if;

  select * into roster_record
  from public.approved_student_roster
  where student_id = requested_student_id
    and school_email = requested_email
    and department_code = 'CBEA'
  limit 1;

  if not found then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      coalesce(requested_full_name, 'Student'),
      'rejected',
      'Student ID and school email do not match the approved CSU Gonzaga CBEA roster.'
    );
    return new;
  end if;

  if roster_record.status <> 'eligible' then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      roster_record.full_name,
      'rejected',
      'This roster record is not eligible for registration.'
    );
    return new;
  end if;

  if roster_record.claimed_by_user_id is not null and roster_record.claimed_by_user_id <> new.id then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      roster_record.full_name,
      'needs_admin_review',
      'This student roster record is already linked to another account.'
    );
    return new;
  end if;

  select id into existing_profile_id
  from public.student_profiles
  where (student_id = requested_student_id or email = requested_email)
    and user_id <> new.id
  limit 1;

  if existing_profile_id is not null then
    perform public.upsert_student_registration_request(
      new.id,
      requested_student_id,
      requested_email,
      roster_record.full_name,
      'needs_admin_review',
      'A student profile already exists for this student ID or email.'
    );
    return new;
  end if;

  insert into public.users (id, role, email, full_name, is_active)
  values (new.id, 'student', requested_email, roster_record.full_name, true)
  on conflict (id) do update set
    role = 'student',
    email = excluded.email,
    full_name = excluded.full_name,
    is_active = true,
    updated_at = now();

  insert into public.student_profiles (
    user_id,
    student_id,
    full_name,
    email,
    course_id,
    section_id,
    year_level,
    is_active
  )
  values (
    new.id,
    requested_student_id,
    roster_record.full_name,
    requested_email,
    roster_record.course_id,
    roster_record.section_id,
    roster_record.year_level,
    true
  )
  on conflict (user_id) do update set
    student_id = excluded.student_id,
    full_name = excluded.full_name,
    email = excluded.email,
    course_id = excluded.course_id,
    section_id = excluded.section_id,
    year_level = excluded.year_level,
    is_active = true,
    updated_at = now();

  update public.approved_student_roster
  set claimed_by_user_id = new.id,
      claimed_at = coalesce(claimed_at, now()),
      updated_at = now()
  where student_id = requested_student_id;

  perform public.upsert_student_registration_request(
    new.id,
    requested_student_id,
    requested_email,
    roster_record.full_name,
    'approved',
    'School email confirmed and roster record matched.'
  );

  return new;
end;
$$;

drop trigger if exists auth_users_complete_student_registration on auth.users;
create trigger auth_users_complete_student_registration
after insert or update of email_confirmed_at, raw_user_meta_data
on auth.users
for each row
execute function public.complete_verified_student_registration();

alter table public.approved_student_roster enable row level security;
alter table public.student_registration_requests enable row level security;

drop policy if exists "admins manage approved student roster" on public.approved_student_roster;
create policy "admins manage approved student roster" on public.approved_student_roster
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage registration requests" on public.student_registration_requests;
create policy "admins manage registration requests" on public.student_registration_requests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "students read own registration request" on public.student_registration_requests;
create policy "students read own registration request" on public.student_registration_requests
  for select using (auth_user_id = auth.uid() or public.is_admin());

drop trigger if exists approved_student_roster_set_updated_at on public.approved_student_roster;
create trigger approved_student_roster_set_updated_at
before update on public.approved_student_roster
for each row execute function public.set_updated_at();

drop trigger if exists student_registration_requests_set_updated_at on public.student_registration_requests;
create trigger student_registration_requests_set_updated_at
before update on public.student_registration_requests
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-verification-documents', 'student-verification-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "students upload own verification documents" on storage.objects;
create policy "students upload own verification documents" on storage.objects
  for insert with check (
    bucket_id = 'student-verification-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "students and admins read verification documents" on storage.objects;
create policy "students and admins read verification documents" on storage.objects
  for select using (
    bucket_id = 'student-verification-documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );
