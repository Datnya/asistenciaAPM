drop function if exists public.apply_admin_attendance_correction(uuid, uuid, date, public.attendance_work_type, time, time, integer, text);

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
  if length(trim(p_reason)) not between 1 and 500 then raise exception 'El motivo de la corrección es obligatorio.'; end if;
  if p_work_date > (timezone('America/Lima', now()))::date then raise exception 'La fecha de jornada no puede ser futura.'; end if;
  if p_exit_time < p_entry_time then raise exception 'La salida debe ser igual o posterior al ingreso.'; end if;
  if p_declared_minutes not between 1 and 1440 then raise exception 'Las horas declaradas deben estar entre 00:01 y 24:00.'; end if;

  select to_jsonb(session.*), session.consultant_user_id into v_before, v_consultant_user_id
  from public.attendance_sessions session where session.id = p_session_id for update;
  if v_before is null then raise exception 'La jornada no existe.'; end if;
  if not exists (
    select 1 from public.consultant_client_assignments assignment
    join public.clients client on client.id = assignment.client_id
    where assignment.consultant_user_id = v_consultant_user_id and assignment.client_id = p_client_id
      and assignment.is_active = true and client.is_active = true
  ) then raise exception 'El cliente debe estar activo y asignado al consultor.'; end if;

  update public.attendance_sessions
  set work_date = p_work_date, client_id = p_client_id, work_type = p_work_type,
      entry_time = p_entry_time, exit_time = p_exit_time, declared_minutes = p_declared_minutes
  where id = p_session_id
  returning to_jsonb(attendance_sessions.*) into v_after;

  insert into public.attendance_audit_log (attendance_session_id, actor_user_id, action, reason, before_data, after_data)
  values (p_session_id, p_actor_user_id, 'update', trim(p_reason), v_before, v_after);
end;
$$;

revoke execute on function public.apply_admin_attendance_correction(uuid, uuid, date, uuid, public.attendance_work_type, time, time, integer, text) from public, anon, authenticated;
grant execute on function public.apply_admin_attendance_correction(uuid, uuid, date, uuid, public.attendance_work_type, time, time, integer, text) to service_role;
