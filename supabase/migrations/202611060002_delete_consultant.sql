create table if not exists public.consultant_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  consultant_user_id uuid not null unique,
  username text not null,
  storage_deleted boolean not null default false,
  auth_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.consultant_deletion_jobs enable row level security;
revoke all on public.consultant_deletion_jobs from anon, authenticated;
grant select, insert, update, delete on public.consultant_deletion_jobs to service_role;

create or replace function public.prepare_consultant_deletion(p_consultant_user_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_username text;
  v_job_id uuid;
begin
  select username into v_username
  from public.profiles
  where user_id = p_consultant_user_id and role = 'consultant'
  for update;

  if v_username is null then
    raise exception 'El consultor no existe.';
  end if;

  if exists (
    select 1 from public.attendance_audit_log log
    where log.actor_user_id = p_consultant_user_id
      and not exists (
        select 1 from public.attendance_sessions session
        where session.id = log.attendance_session_id
          and session.consultant_user_id = p_consultant_user_id
      )
  ) then
    raise exception 'El usuario figura como actor en auditorías de otros consultores.';
  end if;

  insert into public.consultant_deletion_jobs (consultant_user_id, username)
  values (p_consultant_user_id, v_username)
  returning id into v_job_id;

  delete from public.attendance_audit_log log
  using public.attendance_sessions session
  where log.attendance_session_id = session.id
    and session.consultant_user_id = p_consultant_user_id;

  delete from public.attendance_activities activity
  using public.attendance_sessions session
  where activity.session_id = session.id
    and session.consultant_user_id = p_consultant_user_id;

  delete from public.attendance_sessions
  where consultant_user_id = p_consultant_user_id;

  delete from public.consultant_client_assignments
  where consultant_user_id = p_consultant_user_id;

  delete from public.profiles
  where user_id = p_consultant_user_id and role = 'consultant';

  return v_job_id;
end;
$$;

revoke execute on function public.prepare_consultant_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_consultant_deletion(uuid) to service_role;
