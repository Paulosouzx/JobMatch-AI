# JobMatch AI: Specification

Open source job aggregator. Collects vacancies from free sources, filters by rules, scores with an LLM against the user profile and notifies good matches on Telegram. Applications are semi-automatic: the tool prepares score, rationale and cover letter; the user reviews and applies. No browser automation for applications.

Hard requirement: zero cost, everything fits in free tiers. BYOK: every user brings their own keys.

## Decisions

- Standalone repo `jobmatch-ai/`, MIT license, pnpm workspaces, TypeScript everywhere.
- Code contains no comments. Code, names, README and commits in English; UI in pt-BR with `react-i18next`.
- Migrations live as files in `supabase/migrations`. The reference instance reuses an existing free-tier Supabase project (Time Tracker), so every object is prefixed `jm_` (tables, enums, functions, triggers, policies) and lives in `public`. Nothing runs locally; no Docker.
- Because the project is shared, the `auth.users` triggers act only on users whose signup metadata has `app = 'jobmatch'`. Signups from the web app always send that metadata. A direct API signup without it creates a project user with no JobMatch rows. Disabling Auth signups project-wide is not used, since it would break the other apps; `jm_signup_gate` enforces `ALLOW_SIGNUPS` instead (first account is always allowed, later ones need `jm_app_config.allow_signups = true`). A self-hoster with a dedicated project can additionally disable signups in the Supabase dashboard.
- Frontend deployed on Netlify (Vercel works unchanged).
- PDF text extraction runs in the browser (`pdfjs-dist`).
- Prompts in English; `summary` and `reasons` returned in pt-BR (configurable).
- Lint with ESLint (flat config) + Prettier.
- `ALLOW_SIGNUPS` is enforced in the UI and server-side by disabling signups in Supabase Auth.
- Secrets are stored in Supabase Vault through `user_secrets` (kind, vault_secret_id, last4) instead of per-kind columns in `settings`. Only `last4` is readable by the client.

## Structure

```
apps/web         React + Vite + Tailwind
apps/worker      Node script run by GitHub Actions cron
packages/core    types, collectors, normalize, dedupe, rule filter, LLM layer, prompts (fetch + zod only)
supabase/        migrations, RLS, Edge Functions
docs/ .github/workflows/ (ci.yml, worker.yml)
```

## Database

All tables carry `user_id` and have RLS.

- `profiles`: cv_text, skills, seniority, location, work_modes, must/exclude keywords, ignored companies. Created by trigger on `auth.users`.
- `settings`: provider, model, base url, telegram chat id, adzuna app id, min_score, daily_llm_limit, frequency_hours, llm_concurrency. Created by the same trigger.
- `user_secrets`: Vault references and last4 per kind (llm, telegram, adzuna, itjobs). Readable only by column (no secret id) by the owner.
- `sources`: type, enabled, config jsonb.
- `jobs`: normalized job, `raw jsonb`, `dedupe_hash`, `rule_status`. `unique(user_id, source, external_id)`.
- `job_matches`: score, analysis jsonb, model, prompt_version, status (`new|seen|saved|applied|discarded`), notified_at, error.
- `applications`: cover_letter, status, applied_at, notes.
- `run_logs`: duration, collected, new, filtered, scored, notified, llm_calls, errors.
- `llm_usage`: per-day call counter; `bump_llm_usage` increments atomically and enforces the daily limit.

Table names carry the `jm_` prefix (e.g. `jm_profiles`). Secret functions (`jm_set_user_secret`, `jm_delete_user_secret`, `jm_get_user_secret`, `jm_bump_llm_usage`) are `SECURITY DEFINER` and executable only by `service_role`.

## Phases

1. Monorepo, Supabase migrations, RLS, Vault functions, CI.
2. Auth: login, signup, recovery, reset, magic link, optional GitHub OAuth, protected routes, ALLOW_SIGNUPS.
3. Landing page.
4. Settings and BYOK: `save-secret`, `test-llm`, `test-telegram`, masked keys.
5. Profile page, PDF text extraction.
6. Collectors (Remotive, Arbeitnow, RemoteOK, Greenhouse, Lever, Adzuna, ITJobs.pt), normalization, dedupe.
7. Rule filter.
8. LLM layer (Gemini, Groq, OpenRouter, Ollama), scoring, queue with backoff and daily limit, PII stripping, versioned prompts.
9. Worker on GitHub Actions and Telegram notifications.
10. Dashboard and cover letter Edge Function.
11. Tests, CI, README with Mermaid diagram, free tier limits and privacy notes.

Each phase ends with a stop for validation.

## Notes

- `packages/core` must stay runtime-agnostic (fetch + zod) to run in Node and Deno.
- Gemini free tier may use submitted data for training; PII stripping is heuristic and documented as such.
- GitHub Actions cron has variable delay and public repos are paused after 60 days of inactivity.
- Verify each source's terms and response format when building its collector (RemoteOK requires attribution).
