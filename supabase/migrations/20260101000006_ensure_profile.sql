create function public.jm_ensure_profile() returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  if exists (select 1 from public.jm_profiles where user_id = v_user_id) then
    insert into public.jm_settings (user_id) values (v_user_id) on conflict do nothing;
    return false;
  end if;

  if exists (select 1 from public.jm_profiles) and not (select allow_signups from public.jm_app_config) then
    raise exception 'signups are disabled for this instance' using errcode = 'P0001';
  end if;

  insert into public.jm_profiles (user_id) values (v_user_id) on conflict do nothing;
  insert into public.jm_settings (user_id) values (v_user_id) on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.jm_ensure_profile() from public, anon;
grant execute on function public.jm_ensure_profile() to authenticated;
