alter table public.profiles
  add column if not exists dni text,
  add column if not exists avatar_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_dni_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_dni_format
      check (dni is null or dni ~ '^[0-9]{8}$');
  end if;
end $$;

create unique index if not exists profiles_dni_unique_idx
  on public.profiles (dni)
  where dni is not null;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name extensions.citext not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_name_not_blank check (length(trim(name::text)) > 0)
);

create table if not exists public.consultant_client_assignments (
  id uuid primary key default gen_random_uuid(),
  consultant_user_id uuid not null references public.profiles(user_id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint consultant_client_assignments_unique unique (consultant_user_id, client_id)
);

create index if not exists consultant_client_assignments_client_id_idx
  on public.consultant_client_assignments (client_id);

create index if not exists consultant_client_assignments_consultant_active_idx
  on public.consultant_client_assignments (consultant_user_id, is_active);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'clients_set_updated_at'
      and tgrelid = 'public.clients'::regclass
  ) then
    create trigger clients_set_updated_at
    before update on public.clients
    for each row execute function private.set_updated_at();
  end if;
end $$;

alter table public.clients enable row level security;
alter table public.consultant_client_assignments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_select_admin'
  ) then
    create policy clients_select_admin
    on public.clients
    for select
    to authenticated
    using ((select private.current_user_is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'clients'
      and policyname = 'clients_select_assigned_consultant'
  ) then
    create policy clients_select_assigned_consultant
    on public.clients
    for select
    to authenticated
    using (
      is_active
      and (select private.current_user_is_active())
      and exists (
        select 1
        from public.consultant_client_assignments assignment
        where assignment.client_id = clients.id
          and assignment.consultant_user_id = (select auth.uid())
          and assignment.is_active
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'consultant_client_assignments'
      and policyname = 'consultant_client_assignments_select_admin'
  ) then
    create policy consultant_client_assignments_select_admin
    on public.consultant_client_assignments
    for select
    to authenticated
    using ((select private.current_user_is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'consultant_client_assignments'
      and policyname = 'consultant_client_assignments_select_self'
  ) then
    create policy consultant_client_assignments_select_self
    on public.consultant_client_assignments
    for select
    to authenticated
    using (
      consultant_user_id = (select auth.uid())
      and is_active
      and (select private.current_user_is_active())
    );
  end if;
end $$;

revoke all on table public.clients from anon;
revoke all on table public.consultant_client_assignments from anon;
revoke insert, update, delete on table public.clients from authenticated;
revoke insert, update, delete on table public.consultant_client_assignments from authenticated;

grant select on table public.clients to authenticated;
grant select on table public.consultant_client_assignments to authenticated;
