create index if not exists attendance_audit_log_actor_idx
  on public.attendance_audit_log (actor_user_id);

create policy "attendance_audit_log_no_direct_access"
  on public.attendance_audit_log
  for select
  to authenticated
  using (false);
