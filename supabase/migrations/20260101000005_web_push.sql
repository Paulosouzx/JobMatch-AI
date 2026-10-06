create table public.jm_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.jm_push_subscriptions enable row level security;

create policy jm_push_subscriptions_owner on public.jm_push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.jm_push_subscriptions from anon;

alter table public.jm_app_config add column vapid_public_key text;
alter table public.jm_app_config add column vapid_subject text not null default 'mailto:admin@example.com';

create function public.jm_vapid_public_key() returns text
language sql
security definer
stable
set search_path = ''
as $$
  select vapid_public_key from public.jm_app_config where id;
$$;

revoke all on function public.jm_vapid_public_key() from public, anon;
grant execute on function public.jm_vapid_public_key() to authenticated, service_role;

create function public.jm_vapid_config()
returns table (public_key text, private_key text, subject text)
language sql
security definer
stable
set search_path = ''
as $$
  select c.vapid_public_key, s.decrypted_secret, c.vapid_subject
  from public.jm_app_config c
  left join vault.decrypted_secrets s on s.name = 'jm:vapid_private_key'
  where c.id;
$$;

revoke all on function public.jm_vapid_config() from public, anon, authenticated;
grant execute on function public.jm_vapid_config() to service_role;

alter table public.jm_settings drop column telegram_chat_id;
