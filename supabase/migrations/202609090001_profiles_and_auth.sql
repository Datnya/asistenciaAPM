create extension if not exists citext with schema extensions;

do $$ begin
  create type public.app_role as enum ('admin', 'consultant');
exception when duplicate_object then null;
end $$;

create schema if not exists private;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  username extensions.citext not null unique,
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  role public.app_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_normalized check (
    username::text = lower(trim(username::text))
    and username::text ~ '^[a-z0-9][a-z0-9._-]*$'
  )
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'profiles_set_updated_at'
      and tgrelid = 'public.profiles'::regclass
  ) then
    create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function private.set_updated_at();
  end if;
end $$;

create or replace function private.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = (select auth.uid())
      and is_active
  );
$$;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin'
    and (select private.current_user_is_active());
$$;

grant usage on schema private to authenticated;

grant execute on function private.current_user_is_active() to authenticated;
grant execute on function private.current_user_is_admin() to authenticated;

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_self'
  ) then
    create policy profiles_select_self
    on public.profiles
    for select
    to authenticated
    using (
      user_id = (select auth.uid())
      and (select private.current_user_is_active())
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_admin'
  ) then
    create policy profiles_select_admin
    on public.profiles
    for select
    to authenticated
    using ((select private.current_user_is_admin()));
  end if;
end $$;

grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;
