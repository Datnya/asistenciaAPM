do $$
begin
  create type public.attendance_work_type as enum ('remote', 'onsite');
exception when duplicate_object then null;
end $$;

alter table public.attendance_sessions
  add column if not exists work_type public.attendance_work_type;

create or replace function public.create_historical_attendance(
  p_consultant_user_id uuid,
  p_client_id uuid,
  p_work_date date,
  p_work_type public.attendance_work_type,
  p_entry_time time,
  p_exit_time time,
  p_declared_minutes integer,
  p_activities jsonb,
  p_submission_location_status public.attendance_location_status,
  p_submission_latitude numeric default null,
  p_submission_longitude numeric default null,
  p_submission_accuracy_m numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_activity jsonb;
begin
  if p_work_date >= (timezone('America/Lima', now()))::date then
    raise exception 'El registro histórico debe corresponder a una fecha pasada.';
  end if;

  if p_exit_time < p_entry_time then
    raise exception 'La hora de salida debe ser igual o posterior a la hora de ingreso.';
  end if;

  if p_declared_minutes not between 1 and 1440 then
    raise exception 'Las horas declaradas deben estar entre 00:01 y 24:00.';
  end if;

  if jsonb_typeof(p_activities) <> 'array' or jsonb_array_length(p_activities) = 0 then
    raise exception 'Registra al menos una actividad para la jornada histórica.';
  end if;

  insert into public.attendance_sessions (
    consultant_user_id, client_id, work_date, work_type, record_mode, status, entry_time
  ) values (
    p_consultant_user_id, p_client_id, p_work_date, p_work_type, 'historical', 'open', p_entry_time
  ) returning id into v_session_id;

  for v_activity in select value from jsonb_array_elements(p_activities)
  loop
    insert into public.attendance_activities (session_id, area_code, other_area_name, description)
    values (
      v_session_id,
      (v_activity->>'areaCode')::public.attendance_area_code,
      case when v_activity->>'areaCode' = 'other' then nullif(trim(v_activity->>'otherAreaName'), '') else null end,
      trim(v_activity->>'description')
    );
  end loop;

  update public.attendance_sessions
  set
    status = 'closed',
    exit_time = p_exit_time,
    declared_minutes = p_declared_minutes,
    submission_location_status = p_submission_location_status,
    submission_latitude = case when p_submission_location_status = 'granted' then p_submission_latitude else null end,
    submission_longitude = case when p_submission_location_status = 'granted' then p_submission_longitude else null end,
    submission_accuracy_m = case when p_submission_location_status = 'granted' then p_submission_accuracy_m else null end,
    closed_at = now()
  where id = v_session_id;

  return v_session_id;
end;
$$;

revoke execute on function public.create_historical_attendance(
  uuid, uuid, date, public.attendance_work_type, time, time, integer, jsonb,
  public.attendance_location_status, numeric, numeric, numeric
) from public, anon, authenticated;

grant execute on function public.create_historical_attendance(
  uuid, uuid, date, public.attendance_work_type, time, time, integer, jsonb,
  public.attendance_location_status, numeric, numeric, numeric
) to service_role;
