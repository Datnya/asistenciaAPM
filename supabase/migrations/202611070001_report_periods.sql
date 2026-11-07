create table if not exists public.report_periods (
  id uuid primary key default gen_random_uuid(),
  consultant_user_id uuid not null references public.profiles(user_id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_by uuid not null,
  updated_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_period_valid_range check (end_date >= start_date),
  constraint report_period_start_unique unique (consultant_user_id, start_date) deferrable initially deferred
);

create index if not exists report_periods_consultant_start_idx
  on public.report_periods (consultant_user_id, start_date desc);

alter table public.report_periods enable row level security;
revoke all on public.report_periods from anon, authenticated;
grant select on public.report_periods to authenticated;
grant select, insert, update, delete on public.report_periods to service_role;

create policy report_periods_select_self on public.report_periods
  for select to authenticated
  using (consultant_user_id = (select auth.uid()) and (select private.current_user_is_active()));

create policy report_periods_select_admin on public.report_periods
  for select to authenticated
  using ((select private.current_user_is_admin()));

create or replace function public.create_report_period(
  p_consultant_user_id uuid,
  p_actor_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_role public.app_role;
  v_actor_active boolean;
  v_last_end date;
  v_id uuid;
begin
  select role, is_active into v_actor_role, v_actor_active
  from public.profiles where user_id = p_actor_user_id;
  if not coalesce(v_actor_active, false) or
     (v_actor_role <> 'admin' and not (v_actor_role = 'consultant' and p_actor_user_id = p_consultant_user_id)) then
    raise exception 'No tienes permiso para crear este período.';
  end if;
  perform 1 from public.profiles
  where user_id = p_consultant_user_id and role = 'consultant'
  for update;
  if not found then raise exception 'El consultor no existe.'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Selecciona un rango de fechas válido.';
  end if;

  select max(end_date) into v_last_end from public.report_periods
  where consultant_user_id = p_consultant_user_id;
  if v_last_end is not null and p_start_date <> v_last_end + 1 then
    raise exception 'El siguiente período debe comenzar el día posterior al cierre anterior.';
  end if;

  insert into public.report_periods (consultant_user_id, start_date, end_date, created_by, updated_by)
  values (p_consultant_user_id, p_start_date, p_end_date, p_actor_user_id, p_actor_user_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_report_period(
  p_period_id uuid,
  p_actor_user_id uuid,
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_consultant_id uuid;
  v_old_start date;
  v_previous_end date;
  v_next_id uuid;
  v_next_end date;
begin
  if not exists (
    select 1 from public.profiles
    where user_id = p_actor_user_id and role = 'admin' and is_active
  ) then raise exception 'Solo ADMIN puede corregir un período.'; end if;
  select consultant_user_id into v_consultant_id from public.report_periods where id = p_period_id;
  if v_consultant_id is null then raise exception 'El período no existe.'; end if;
  perform 1 from public.profiles where user_id = v_consultant_id for update;
  select start_date into v_old_start from public.report_periods where id = p_period_id for update;
  if v_old_start is null then raise exception 'El período ya no existe.'; end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'Selecciona un rango de fechas válido.';
  end if;

  select max(end_date) into v_previous_end from public.report_periods
  where consultant_user_id = v_consultant_id and start_date < v_old_start;
  if v_previous_end is not null and p_start_date <> v_previous_end + 1 then
    raise exception 'El inicio debe ser el día posterior al cierre del período anterior.';
  end if;

  select id, end_date into v_next_id, v_next_end from public.report_periods
  where consultant_user_id = v_consultant_id and start_date > v_old_start
  order by start_date limit 1 for update;
  if v_next_id is not null and p_end_date + 1 > v_next_end then
    raise exception 'El cierre propuesto deja sin fechas al período siguiente.';
  end if;

  update public.report_periods set
    start_date = p_start_date, end_date = p_end_date,
    updated_by = p_actor_user_id, updated_at = now()
  where id = p_period_id;
  if v_next_id is not null then
    update public.report_periods set
      start_date = p_end_date + 1,
      updated_by = p_actor_user_id, updated_at = now()
    where id = v_next_id;
  end if;
end;
$$;

revoke execute on function public.create_report_period(uuid, uuid, date, date) from public, anon, authenticated;
revoke execute on function public.update_report_period(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function public.create_report_period(uuid, uuid, date, date) to service_role;
grant execute on function public.update_report_period(uuid, uuid, date, date) to service_role;
