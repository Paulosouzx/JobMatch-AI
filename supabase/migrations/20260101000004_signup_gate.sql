create table public.jm_app_config (
  id boolean primary key default true check (id),
  allow_signups boolean not null default false
);
insert into public.jm_app_config (id) values (true);
alter table public.jm_app_config enable row level security;
revoke all on public.jm_app_config from anon, authenticated;

create function public.jm_enforce_signup_gate() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'jobmatch' then
    return new;
  end if;
  if exists (select 1 from public.jm_profiles) and not (select allow_signups from public.jm_app_config) then
    raise exception 'signups are disabled for this instance' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger jm_signup_gate before insert on auth.users
  for each row execute function public.jm_enforce_signup_gate();

revoke all on function public.jm_set_updated_at() from public, anon, authenticated;
revoke all on function public.jm_handle_new_user() from public, anon, authenticated;
revoke all on function public.jm_enforce_signup_gate() from public, anon, authenticated;
