create table public.billing_rates (
  client_id uuid primary key references public.clients(id),
  rate numeric(10,2) not null check (rate > 0)
);
create table public.period_invoices (
  period_id uuid primary key references public.report_periods(id),
  client_id uuid not null references public.clients(id),
  number text not null check (length(trim(number)) between 1 and 80),
  issued date not null,
  minutes bigint not null check (minutes > 0),
  rate numeric(10,2) not null check (rate > 0),
  start_date date not null,
  end_date date not null
);
alter table public.billing_rates enable row level security;
alter table public.period_invoices enable row level security;
revoke all on public.billing_rates, public.period_invoices from public, anon, authenticated;
grant select, insert, update on public.billing_rates to service_role;
grant select, insert on public.period_invoices to service_role;

create view public.billing_overview with (security_invoker=true) as
select p.id, p.consultant_user_id, concat_ws(' ',u.first_name,u.last_name) consultant,
  coalesce(i.start_date,p.start_date) start_date, coalesce(i.end_date,p.end_date) end_date,
  c.id client_id, c.name client, coalesce(i.minutes,a.minutes,0) minutes,
  coalesce(i.rate,r.rate,89.00) rate, i.number, i.issued, a.client_count
from public.report_periods p
join public.profiles u on u.user_id=p.consultant_user_id
left join public.period_invoices i on i.period_id=p.id
left join lateral (
  select sum(s.declared_minutes) minutes, count(distinct s.client_id) client_count,
    case when count(distinct s.client_id)=1 then min(s.client_id::text)::uuid end client_id
  from public.attendance_sessions s where s.consultant_user_id=p.consultant_user_id
    and s.status='closed' and s.work_date between p.start_date and p.end_date
) a on true
left join lateral (
  select case when count(distinct x.client_id)=1 then min(x.client_id::text)::uuid end client_id
  from public.consultant_client_assignments x where x.consultant_user_id=p.consultant_user_id and x.is_active
) assignment on true
left join public.clients c on c.id=coalesce(i.client_id,a.client_id,case when a.client_count=0 then assignment.client_id end)
left join public.billing_rates r on r.client_id=c.id;
revoke all on public.billing_overview from public, anon, authenticated;
grant select on public.billing_overview to service_role;

create function public.record_period_invoice(p_id uuid,p_client uuid,p_rate numeric,p_minutes bigint,p_number text,p_issued date)
returns void language plpgsql security invoker set search_path='' as $$
begin
  insert into public.period_invoices(period_id,client_id,rate,minutes,number,issued,start_date,end_date)
  select id,client_id,rate,minutes,trim(p_number),p_issued,start_date,end_date from public.billing_overview
  where id=p_id and number is null and client_id=p_client and rate=p_rate and minutes=p_minutes and minutes>0;
  if not found then raise exception 'Actualiza la vista y revisa las horas y la tarifa antes de registrar.'; end if;
end;
$$;
revoke all on function public.record_period_invoice(uuid,uuid,numeric,bigint,text,date) from public,anon,authenticated;
grant execute on function public.record_period_invoice(uuid,uuid,numeric,bigint,text,date) to service_role;
