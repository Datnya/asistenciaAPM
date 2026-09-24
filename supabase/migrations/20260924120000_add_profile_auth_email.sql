alter table public.profiles
  add column if not exists auth_email extensions.citext;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_email_normalized'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_auth_email_normalized
      check (
        auth_email is null
        or (
          auth_email::text = lower(trim(auth_email::text))
          and auth_email::text ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
        )
      );
  end if;
end $$;

create unique index if not exists profiles_auth_email_unique_idx
  on public.profiles (auth_email)
  where auth_email is not null;
