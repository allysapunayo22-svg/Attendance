\set ON_ERROR_STOP on

-- Hosted Supabase owns pgcrypto in the extensions schema. Install it there in
-- the isolated harness so schema-qualified calls are tested accurately.
create schema extensions;
create extension if not exists pgcrypto with schema extensions;

create schema auth;
create schema storage;

create function auth.uid()
returns uuid
language sql
stable
as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;

create function storage.foldername(p_name text)
returns text[]
language sql
immutable
as $$select string_to_array(p_name, '/')$$;

create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  metadata jsonb
);

grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;
