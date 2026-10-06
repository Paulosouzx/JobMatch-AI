create function public.jm_set_user_secret(p_user_id uuid, p_kind public.jm_secret_kind, p_value text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  if p_value is null or length(p_value) = 0 then
    raise exception 'secret value must not be empty';
  end if;

  select vault_secret_id into v_secret_id
  from public.jm_user_secrets
  where user_id = p_user_id and kind = p_kind;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(p_value, 'jm:user:' || p_user_id || ':' || p_kind);
  else
    perform vault.update_secret(v_secret_id, p_value);
  end if;

  insert into public.jm_user_secrets (user_id, kind, vault_secret_id, last4)
  values (p_user_id, p_kind, v_secret_id, right(p_value, 4))
  on conflict (user_id, kind)
  do update set vault_secret_id = excluded.vault_secret_id,
                last4 = excluded.last4,
                updated_at = now();
end;
$$;

create function public.jm_delete_user_secret(p_user_id uuid, p_kind public.jm_secret_kind)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
begin
  select vault_secret_id into v_secret_id
  from public.jm_user_secrets
  where user_id = p_user_id and kind = p_kind;

  if v_secret_id is not null then
    delete from public.jm_user_secrets where user_id = p_user_id and kind = p_kind;
    delete from vault.secrets where id = v_secret_id;
  end if;
end;
$$;

create function public.jm_get_user_secret(p_user_id uuid, p_kind public.jm_secret_kind)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select ds.decrypted_secret
  from public.jm_user_secrets us
  join vault.decrypted_secrets ds on ds.id = us.vault_secret_id
  where us.user_id = p_user_id and us.kind = p_kind;
$$;

create function public.jm_bump_llm_usage(p_user_id uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_calls int;
begin
  insert into public.jm_llm_usage as u (user_id, day, calls)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set calls = u.calls + 1
  where u.calls < p_limit
  returning u.calls into v_calls;

  return v_calls is not null and p_limit > 0;
end;
$$;

revoke all on function public.jm_set_user_secret(uuid, public.jm_secret_kind, text) from public, anon, authenticated;
revoke all on function public.jm_delete_user_secret(uuid, public.jm_secret_kind) from public, anon, authenticated;
revoke all on function public.jm_get_user_secret(uuid, public.jm_secret_kind) from public, anon, authenticated;
revoke all on function public.jm_bump_llm_usage(uuid, int) from public, anon, authenticated;

grant execute on function public.jm_set_user_secret(uuid, public.jm_secret_kind, text) to service_role;
grant execute on function public.jm_delete_user_secret(uuid, public.jm_secret_kind) to service_role;
grant execute on function public.jm_get_user_secret(uuid, public.jm_secret_kind) to service_role;
grant execute on function public.jm_bump_llm_usage(uuid, int) to service_role;
