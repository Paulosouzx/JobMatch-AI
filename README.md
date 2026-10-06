# JobMatch AI

Open source job aggregator that scores vacancies against your profile with an LLM and sends a browser push notification for the good ones.

Applications are **semi-automatic**: the tool prepares the score, the rationale and a cover letter, and you review and apply yourself. There is no browser automation for applying (LinkedIn and Indeed forbid bots).

- **Zero cost**: Supabase, GitHub Actions, Netlify/Vercel and the LLM providers all have free tiers that are enough.
- **BYOK**: every instance uses its owner's keys. Keys live encrypted in Supabase Vault and never return to the browser.
- **Private by design**: email, phone and address are stripped from your CV before anything reaches an LLM.

## How it works

```mermaid
flowchart LR
  subgraph GH[GitHub Actions cron]
    W[Worker]
  end
  subgraph SB[Supabase]
    DB[(Postgres + RLS)]
    V[Vault]
    EF[Edge Functions]
    A[Auth]
  end
  Web[Web app] -->|auth, CRUD under RLS| DB
  Web -->|save-secret, test-connection, generate-cover-letter| EF
  EF --> V
  EF --> DB
  W -->|service role| DB
  W -->|decrypt via SECURITY DEFINER| V
  W --> S[Job sources]
  W --> L[LLM provider]
  W -->|Web Push, VAPID| P[Browser and phone notifications]
  EF --> L
```

Pipeline per run: **collect** (Remotive, Arbeitnow, RemoteOK, Greenhouse, Lever, optional Adzuna and ITJobs.pt) → **normalize** → **dedupe** (by `source + external id` and by a title/company hash across sources) → **rule filter** (free, no LLM) → **LLM score** → **notify** with Web Push → **log the run**.

## Repository layout

```
apps/web         React + Vite + Tailwind (landing, auth, dashboard, settings)
apps/worker      Node script executed by GitHub Actions
packages/core    runtime-agnostic logic: types, collectors, normalizers, dedupe, rules, LLM layer, prompts
supabase/        migrations and Edge Functions
docs/SPEC.md    implementation plan and decisions
```

`packages/core` only uses `fetch` and Zod, so the same code runs in Node (worker) and Deno (Edge Functions).

## Self-hosting

You need free accounts on Supabase, GitHub and Vercel (or Netlify).

1. **Create a Supabase project** (free tier).
2. **Apply the migrations.** With the [Supabase CLI](https://supabase.com/docs/guides/cli): `supabase link --project-ref <ref>` then `supabase db push`. Alternatively paste the files in `supabase/migrations` into the SQL editor, in order. All objects are prefixed `jm_`, so the app can share a project with others.
3. **Configure Auth** (Authentication → URL Configuration): add your frontend URL and `https://<your-site>/**` to the redirect URLs. Email sign-in and account confirmation use one-time codes typed into the app, so they work whether your email templates send a link or a `{{ .Token }}` code. For Google login, enable the Google provider (on by default in the UI; set `VITE_ENABLE_GOOGLE_OAUTH=false` to hide it). For GitHub, enable the provider and set `VITE_ENABLE_GITHUB_OAUTH=true`. OAuth users get their JobMatch profile from `jm_ensure_profile()` on first sign-in, which also enforces the signup gate.
4. **Deploy the Edge Functions**: `pnpm build:edge` (bundles `packages/core` into `supabase/functions/_shared/core.js`), then `supabase functions deploy save-secret test-connection generate-cover-letter`.
5. **Generate VAPID keys for push notifications**: `npx web-push generate-vapid-keys`. Fill `supabase/seed-vapid.example.sql` with them and run it in the SQL editor. The public key is served to signed-in users by `jm_vapid_public_key()`, the private key stays in Vault and is only readable by the service role.
6. **Get a free Gemini key** at [Google AI Studio](https://aistudio.google.com/apikey). Groq, OpenRouter and a local Ollama also work.
7. **Set the worker secrets** in GitHub (Settings → Secrets and variables → Actions): `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The workflow in `.github/workflows/worker.yml` runs every 2 hours and can be triggered manually. The service role key never leaves GitHub Secrets.
8. **Deploy the frontend** on Vercel (root directory `apps/web`, framework Vite) or Netlify (build command `pnpm build`, publish directory `apps/web/dist`). Environment variables are in `.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ALLOW_SIGNUPS`, `VITE_ENABLE_GITHUB_OAUTH`, `VITE_REPO_URL`).
9. **Create your account.** The first account is always allowed. Then keep `VITE_ALLOW_SIGNUPS=false` so strangers cannot sign up on your instance and spend your quota. Signups are also enforced in the database by the `jm_signup_gate` trigger; to allow more accounts set `allow_signups = true` in `jm_app_config`. For a dedicated Supabase project you can additionally disable signups in the Auth settings.
10. **Fill in Settings and Profile**: choose the provider, save your key, test the connection, enable notifications on each device and send a test notification, then paste your CV and preferences. On iPhone/iPad, add the site to the home screen first; iOS only delivers Web Push to installed web apps.

### Local development

```bash
pnpm install
cp .env.example apps/web/.env.local   # fill the VITE_* values
pnpm --filter @jobmatch/web dev
pnpm check                            # lint, format, typecheck, tests
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... JOBMATCH_FORCE=1 pnpm --filter @jobmatch/worker start
```

The worker falls back to `LLM_API_KEY` when no key is saved in the database (useful for development).

## Free tier limits and privacy

- **Supabase free**: 500 MB database, Edge Function invocations and Auth emails are limited. The built-in SMTP sends only a few emails per hour, so configure a custom SMTP if you rely on magic links. Free projects are paused after a week of inactivity.
- **GitHub Actions**: scheduled runs can be delayed by many minutes, and in public repositories schedules are disabled after 60 days without repository activity.
- **LLM free tiers** have per-minute and per-day quotas. The worker limits concurrency, retries HTTP 429 with exponential backoff and stops at the daily limit you configure.
- **Gemini free tier may use submitted data to improve Google's models.** Do not send anything you consider confidential. Use a paid key, Groq, OpenRouter or a local Ollama if that matters to you.
- CV sanitization (email, phone, address) is heuristic and does not guarantee that all personal data is removed.
- **Web Push** is free and works in Chrome, Edge, Firefox and Safari. Notifications are per device and stop if the browser revokes the subscription; expired subscriptions are removed automatically.
- **Job sources**: Remotive asks clients to poll sparingly, and RemoteOK requires linking back to the source. Respect each source's terms.

## License

MIT
