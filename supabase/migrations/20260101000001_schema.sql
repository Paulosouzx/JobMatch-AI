create type public.jm_match_status as enum ('new', 'seen', 'saved', 'applied', 'discarded');
create type public.jm_application_status as enum ('draft', 'applied', 'interview', 'offer', 'rejected');
create type public.jm_secret_kind as enum ('llm', 'telegram', 'adzuna', 'itjobs');

create function public.jm_set_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.jm_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  cv_text text not null default '',
  skills text[] not null default '{}',
  seniority text,
  location text,
  work_modes text[] not null default '{}',
  must_keywords text[] not null default '{}',
  exclude_keywords text[] not null default '{}',
  ignored_companies text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jm_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  llm_provider text not null default 'gemini' check (llm_provider in ('gemini', 'groq', 'openrouter', 'ollama')),
  llm_model text,
  llm_base_url text,
  telegram_chat_id text,
  adzuna_app_id text,
  min_score int not null default 70 check (min_score between 0 and 100),
  daily_llm_limit int not null default 100 check (daily_llm_limit >= 0),
  frequency_hours int not null default 2 check (frequency_hours between 1 and 168),
  llm_concurrency int not null default 2 check (llm_concurrency between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jm_user_secrets (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.jm_secret_kind not null,
  vault_secret_id uuid not null,
  last4 text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind)
);

create table public.jm_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, type)
);

create table public.jm_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null,
  external_id text not null,
  title text not null,
  company text not null,
  location text,
  remote boolean not null default false,
  description text not null default '',
  url text not null,
  posted_at timestamptz,
  dedupe_hash text not null,
  raw jsonb,
  rule_status text not null default 'pending' check (rule_status in ('pending', 'passed', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);
create index jm_jobs_user_dedupe_idx on public.jm_jobs (user_id, dedupe_hash);
create index jm_jobs_user_created_idx on public.jm_jobs (user_id, created_at desc);

create table public.jm_job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null unique references public.jm_jobs (id) on delete cascade,
  score int check (score between 0 and 100),
  analysis jsonb,
  model text,
  prompt_version text,
  status public.jm_match_status not null default 'new',
  notified_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jm_job_matches_user_score_idx on public.jm_job_matches (user_id, score desc);
create index jm_job_matches_user_status_idx on public.jm_job_matches (user_id, status);

create table public.jm_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null unique references public.jm_jobs (id) on delete cascade,
  cover_letter text,
  status public.jm_application_status not null default 'draft',
  applied_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jm_run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  duration_ms int,
  collected int not null default 0,
  new_jobs int not null default 0,
  filtered_out int not null default 0,
  scored int not null default 0,
  notified int not null default 0,
  llm_calls int not null default 0,
  errors jsonb not null default '[]'::jsonb
);
create index jm_run_logs_user_started_idx on public.jm_run_logs (user_id, started_at desc);

create table public.jm_llm_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  calls int not null default 0,
  primary key (user_id, day)
);

create trigger jm_profiles_updated_at before update on public.jm_profiles
  for each row execute function public.jm_set_updated_at();
create trigger jm_settings_updated_at before update on public.jm_settings
  for each row execute function public.jm_set_updated_at();
create trigger jm_sources_updated_at before update on public.jm_sources
  for each row execute function public.jm_set_updated_at();
create trigger jm_job_matches_updated_at before update on public.jm_job_matches
  for each row execute function public.jm_set_updated_at();
create trigger jm_applications_updated_at before update on public.jm_applications
  for each row execute function public.jm_set_updated_at();

create function public.jm_handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'app', '') <> 'jobmatch' then
    return new;
  end if;
  insert into public.jm_profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.jm_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger jm_on_auth_user_created after insert on auth.users
  for each row execute function public.jm_handle_new_user();