alter table public.profiles
  add column if not exists phone_number text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_phone_number_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_phone_number_format
      check (phone_number is null or phone_number ~ '^9[0-9]{8}$');
  end if;
end $$;

do $$ begin
  create type public.attendance_record_mode as enum ('live', 'historical');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_status as enum ('open', 'closed', 'voided');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_area_code as enum (
    'management', 'quality', 'operations', 'human_resources', 'sst',
    'logistics', 'administration', 'finance', 'commercial', 'production', 'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.attendance_location_status as enum (
    'granted', 'permission_denied', 'position_unavailable', 'timeout', 'unsupported'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  consultant_user_id uuid not null references public.profiles(user_id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete restrict,
  work_date date not null,
  record_mode public.attendance_record_mode not null,
  status public.attendance_status not null default 'open',
  entry_time time not null,
  entry_recorded_at timestamptz,
  entry_latitude numeric,
  entry_longitude numeric,
  entry_accuracy_m numeric,
  entry_location_status public.attendance_location_status,
  exit_time time,
  exit_recorded_at timestamptz,
  exit_latitude numeric,
  exit_longitude numeric,
  exit_accuracy_m numeric,
  exit_location_status public.attendance_location_status,
  declared_minutes integer,
  submission_latitude numeric,
  submission_longitude numeric,
  submission_accuracy_m numeric,
  submission_location_status public.attendance_location_status,
  closed_at timestamptz,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_declared_minutes_range
    check (declared_minutes is null or declared_minutes between 1 and 1440),
  constraint attendance_sessions_closed_fields
    check (status <> 'closed' or (exit_time is not null and declared_minutes is not null and closed_at is not null)),
  constraint attendance_sessions_voided_fields
    check (status <> 'voided' or voided_at is not null),
  constraint attendance_sessions_exit_after_entry
    check (exit_time is null or exit_time >= entry_time)
);

create index if not exists attendance_sessions_client_id_idx
  on public.attendance_sessions (client_id);

create index if not exists attendance_sessions_consultant_status_idx
  on public.attendance_sessions (consultant_user_id, status);

create unique index if not exists attendance_sessions_unique_consultant_work_date_idx
  on public.attendance_sessions (consultant_user_id, work_date)
  where status <> 'voided';

create unique index if not exists attendance_sessions_unique_open_consultant_idx
  on public.attendance_sessions (consultant_user_id)
  where status = 'open';

create table if not exists public.attendance_activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  area_code public.attendance_area_code not null,
  other_area_name text,
  description varchar(250) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_activities_description_not_blank check (length(trim(description)) between 1 and 250),
  constraint attendance_activities_other_area check (
    (area_code = 'other' and length(trim(coalesce(other_area_name, ''))) between 1 and 120)
    or (area_code <> 'other' and other_area_name is null)
  )
);

create index if not exists attendance_activities_session_id_idx
  on public.attendance_activities (session_id);

create or replace function private.validate_attendance_session()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.work_date > (timezone('America/Lima', now()))::date then
    raise exception 'La fecha de jornada no puede ser futura.';
  end if;

  if not exists (
    select 1
    from public.consultant_client_assignments assignment
    join public.clients client on client.id = assignment.client_id
    where assignment.consultant_user_id = new.consultant_user_id
      and assignment.client_id = new.client_id
      and assignment.is_active
      and client.is_active
  ) then
    raise exception 'El cliente de la jornada debe estar activo y asignado al consultor.';
  end if;

  if new.record_mode = 'live' and new.entry_recorded_at is null then
    raise exception 'Una jornada live requiere confirmar el ingreso.';
  end if;

  if new.status = 'closed' and not exists (
    select 1 from public.attendance_activities where session_id = new.id
  ) then
    raise exception 'No se puede cerrar una jornada sin actividades.';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'attendance_sessions_validate'
      and tgrelid = 'public.attendance_sessions'::regclass
  ) then
    create trigger attendance_sessions_validate
    before insert or update on public.attendance_sessions
    for each row execute function private.validate_attendance_session();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'attendance_sessions_set_updated_at'
      and tgrelid = 'public.attendance_sessions'::regclass
  ) then
    create trigger attendance_sessions_set_updated_at
    before update on public.attendance_sessions
    for each row execute function private.set_updated_at();
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgname = 'attendance_activities_set_updated_at'
      and tgrelid = 'public.attendance_activities'::regclass
  ) then
    create trigger attendance_activities_set_updated_at
    before update on public.attendance_activities
    for each row execute function private.set_updated_at();
  end if;
end $$;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_activities enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance_sessions'
      and policyname = 'attendance_sessions_select_self'
  ) then
    create policy attendance_sessions_select_self
    on public.attendance_sessions
    for select to authenticated
    using (
      consultant_user_id = (select auth.uid())
      and (select private.current_user_is_active())
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance_sessions'
      and policyname = 'attendance_sessions_select_admin'
  ) then
    create policy attendance_sessions_select_admin
    on public.attendance_sessions
    for select to authenticated
    using ((select private.current_user_is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance_activities'
      and policyname = 'attendance_activities_select_self'
  ) then
    create policy attendance_activities_select_self
    on public.attendance_activities
    for select to authenticated
    using (
      (select private.current_user_is_active())
      and exists (
        select 1 from public.attendance_sessions session
        where session.id = attendance_activities.session_id
          and session.consultant_user_id = (select auth.uid())
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'attendance_activities'
      and policyname = 'attendance_activities_select_admin'
  ) then
    create policy attendance_activities_select_admin
    on public.attendance_activities
    for select to authenticated
    using ((select private.current_user_is_admin()));
  end if;
end $$;

revoke all on table public.attendance_sessions from anon;
revoke all on table public.attendance_activities from anon;
revoke insert, update, delete on table public.attendance_sessions from authenticated;
revoke insert, update, delete on table public.attendance_activities from authenticated;
grant select on table public.attendance_sessions to authenticated;
grant select on table public.attendance_activities to authenticated;
