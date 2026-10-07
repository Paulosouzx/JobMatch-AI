create table public.jm_resume_templates (
  user_id uuid primary key references auth.users (id) on delete cascade,
  structure jsonb not null,
  fields jsonb not null default '{}'::jsonb,
  adaptable text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.jm_style_guides (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rules text[] not null default '{}',
  banned_phrases text[] not null default '{}',
  samples text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.jm_resume_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  job_id uuid not null references public.jm_jobs (id) on delete cascade,
  base_fields jsonb not null,
  review jsonb not null default '[]'::jsonb,
  final_fields jsonb,
  model text,
  prompt_version text,
  status text not null default 'draft' check (status in ('draft', 'final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jm_resume_versions_job_idx on public.jm_resume_versions (user_id, job_id, created_at desc);

create trigger jm_resume_templates_updated_at before update on public.jm_resume_templates
  for each row execute function public.jm_set_updated_at();
create trigger jm_style_guides_updated_at before update on public.jm_style_guides
  for each row execute function public.jm_set_updated_at();
create trigger jm_resume_versions_updated_at before update on public.jm_resume_versions
  for each row execute function public.jm_set_updated_at();

alter table public.jm_resume_templates enable row level security;
alter table public.jm_style_guides enable row level security;
alter table public.jm_resume_versions enable row level security;

create policy jm_resume_templates_owner on public.jm_resume_templates
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy jm_style_guides_owner on public.jm_style_guides
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy jm_resume_versions_owner on public.jm_resume_versions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.jm_resume_templates, public.jm_style_guides, public.jm_resume_versions from anon;
