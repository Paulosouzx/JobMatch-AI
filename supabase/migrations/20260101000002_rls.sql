alter table public.jm_profiles enable row level security;
alter table public.jm_settings enable row level security;
alter table public.jm_user_secrets enable row level security;
alter table public.jm_sources enable row level security;
alter table public.jm_jobs enable row level security;
alter table public.jm_job_matches enable row level security;
alter table public.jm_applications enable row level security;
alter table public.jm_run_logs enable row level security;
alter table public.jm_llm_usage enable row level security;

create policy jm_profiles_owner on public.jm_profiles
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jm_settings_owner on public.jm_settings
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jm_sources_owner on public.jm_sources
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jm_jobs_owner_select on public.jm_jobs
  for select to authenticated using (user_id = (select auth.uid()));

create policy jm_job_matches_owner_select on public.jm_job_matches
  for select to authenticated using (user_id = (select auth.uid()));
create policy jm_job_matches_owner_update on public.jm_job_matches
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jm_applications_owner on public.jm_applications
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jm_run_logs_owner_select on public.jm_run_logs
  for select to authenticated using (user_id = (select auth.uid()));

create policy jm_user_secrets_owner_select on public.jm_user_secrets
  for select to authenticated using (user_id = (select auth.uid()));

create policy jm_llm_usage_owner_select on public.jm_llm_usage
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.jm_user_secrets from anon, authenticated;
grant select (user_id, kind, last4, updated_at) on public.jm_user_secrets to authenticated;

revoke all on public.jm_llm_usage from anon, authenticated;
grant select on public.jm_llm_usage to authenticated;

revoke all on public.jm_run_logs from anon, authenticated;
grant select on public.jm_run_logs to authenticated;

revoke all on public.jm_jobs from anon, authenticated;
grant select on public.jm_jobs to authenticated;

revoke all on public.jm_job_matches from anon, authenticated;
grant select on public.jm_job_matches to authenticated;
grant update (status) on public.jm_job_matches to authenticated;

revoke all on public.jm_profiles, public.jm_settings, public.jm_sources, public.jm_applications from anon;
