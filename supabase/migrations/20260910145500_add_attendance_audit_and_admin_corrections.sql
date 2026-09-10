create table if not exists public.attendance_audit_log (
  id uuid primary key default gen_random_uuid(),
  attendance_session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  actor_user_id uuid not null references public.profiles(user_id) on delete restrict,
  action text not null check (action = 'update'),
  reason text not null check (length(trim(reason)) between 1 and 500),
  before_data jsonb not null,
  after_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists attendance_audit_log_session_created_idx
  on public.attendance_audit_log (attendance_session_id, created_at desc);
create index if not exists attendance_audit_log_actor_idx
  on public.attendance_audit_log (actor_user_id);

alter table public.attendance_audit_log enable row level security;
revoke all on public.attendance_audit_log from anon, authenticated;
create policy "attendance_audit_log_no_direct_access"
  on public.attendance_audit_log
  for select
  to authenticated
  using (false);

create or replace function public.apply_admin_attendance_correction(
  p_session_id uuid,
  p_actor_user_id uuid,
  p_work_date date,
  p_client_id uuid,
  p_work_type public.attendance_work_type,
  p_entry_time time,
  p_exit_time time,
  p_declared_minutes integer,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_before jsonb;
  v_after jsonb;
  v_consultant_user_id uuid;
begin
  if length(trim(p_reason)) not between 1 and 500 then
    raise exception 'El motivo de la corrección es obligatorio.';
  end if;
  if p_work_date > (timezone('America/Lima', now()))::date then
    raise exception 'La fecha de jornada no puede ser futura.';
  end if;
  if p_exit_time < p_entry_time then
    raise exception 'La salida debe ser igual o posterior al ingreso.';
  end if;
  if p_declared_minutes not between 1 and 1440 then
    raise exception 'Las horas declaradas deben estar entre 00:01 y 24:00.';
  end if;

  select to_jsonb(session.*), session.consultant_user_id into v_before, v_consultant_user_id
  from public.attendance_sessions session
  where session.id = p_session_id
  for update;
  if v_before is null then raise exception 'La jornada no existe.'; end if;
  if not exists (
    select 1 from public.consultant_client_assignments assignment
    join public.clients client on client.id = assignment.client_id
    where assignment.consultant_user_id = v_consultant_user_id
      and assignment.client_id = p_client_id
      and assignment.is_active = true
      and client.is_active = true
  ) then
    raise exception 'El cliente debe estar activo y asignado al consultor.';
  end if;
  update public.attendance_sessions
  set work_date = p_work_date,
      client_id = p_client_id,
      work_type = p_work_type,
      entry_time = p_entry_time,
      exit_time = p_exit_time,
      declared_minutes = p_declared_minutes
  where id = p_session_id
  returning to_jsonb(attendance_sessions.*) into v_after;

  insert into public.attendance_audit_log (attendance_session_id, actor_user_id, action, reason, before_data, after_data)
  values (p_session_id, p_actor_user_id, 'update', trim(p_reason), v_before, v_after);
end;
$$;

create or replace function public.delete_admin_attendance(p_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
begin
  select session.id into v_session_id
  from public.attendance_sessions session
  where session.id = p_session_id
  for update;

  if v_session_id is null then
    raise exception 'La jornada no existe.';
  end if;

  delete from public.attendance_audit_log where attendance_session_id = p_session_id;
  delete from public.attendance_activities where session_id = p_session_id;
  delete from public.attendance_sessions where id = p_session_id;
end;
$$;

revoke execute on function public.apply_admin_attendance_correction(uuid, uuid, date, uuid, public.attendance_work_type, time, time, integer, text) from public, anon, authenticated;
grant execute on function public.apply_admin_attendance_correction(uuid, uuid, date, uuid, public.attendance_work_type, time, time, integer, text) to service_role;
revoke execute on function public.delete_admin_attendance(uuid) from public, anon, authenticated;
grant execute on function public.delete_admin_attendance(uuid) to service_role;
