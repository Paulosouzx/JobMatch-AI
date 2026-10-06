import {
  createLLMProvider,
  dedupeHash,
  dedupeJobs,
  externalKey,
  applyRules,
  LLMQueue,
  DailyLimitReachedError,
  type Job,
  type MatchScore,
  type Profile,
} from '@jobmatch/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkerEnv } from '../env';
import { formatMatchMessage, sendTelegramMessage } from '../telegram';
import { buildCollectTasks } from './collect';
import {
  emptyStats,
  toProfile,
  type ProfileRow,
  type RunStats,
  type SourceRow,
  type UserSettings,
} from './types';

const KNOWN_WINDOW_DAYS = 90;
const MAX_SCORE_PER_RUN = 60;
const INSERT_CHUNK = 100;

async function getSecret(db: SupabaseClient, userId: string, kind: string): Promise<string | null> {
  const { data, error } = await db.rpc('jm_get_user_secret', { p_user_id: userId, p_kind: kind });
  if (error) throw new Error(`reading ${kind} secret failed: ${error.message}`);
  return typeof data === 'string' ? data : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadKnown(db: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - KNOWN_WINDOW_DAYS * 86_400_000).toISOString();
  const externalKeys: string[] = [];
  const hashes: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('jm_jobs')
      .select('source, external_id, dedupe_hash')
      .eq('user_id', userId)
      .gte('created_at', since)
      .range(from, from + 999);
    if (error) throw new Error(`loading known jobs failed: ${error.message}`);
    for (const row of data ?? []) {
      externalKeys.push(`${row.source}:${row.external_id}`);
      hashes.push(row.dedupe_hash);
    }
    if (!data || data.length < 1000) break;
  }
  return { externalKeys, hashes };
}

async function collectAndStore(
  db: SupabaseClient,
  userId: string,
  settings: UserSettings,
  profile: Profile,
  stats: RunStats,
): Promise<void> {
  const { data: sourceRows } = await db
    .from('jm_sources')
    .select('type, enabled, config')
    .eq('user_id', userId);
  const tasks = buildCollectTasks((sourceRows ?? []) as SourceRow[], settings, {
    adzunaKey: await getSecret(db, userId, 'adzuna'),
    itjobsKey: await getSecret(db, userId, 'itjobs'),
  });

  const collected: { job: Job; raw: unknown }[] = [];
  for (const task of tasks) {
    try {
      const result = await task.run(fetch);
      collected.push(...result.jobs);
      stats.errors.push(...result.errors);
    } catch (error) {
      stats.errors.push(`${task.id}: ${errorText(error)}`);
    }
  }
  stats.collected = collected.length;

  const rawByKey = new Map(collected.map((item) => [externalKey(item.job), item.raw]));
  const known = await loadKnown(db, userId);
  const { fresh } = dedupeJobs(
    collected.map((item) => item.job),
    known,
  );
  stats.newJobs = fresh.length;

  const rows = fresh.map((job) => {
    const result = applyRules(job, profile);
    if (!result.passed) stats.filteredOut++;
    return {
      user_id: userId,
      source: job.source,
      external_id: job.externalId,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      description: job.description,
      url: job.url,
      posted_at: job.postedAt,
      dedupe_hash: dedupeHash(job.title, job.company),
      raw: rawByKey.get(externalKey(job)) ?? null,
      rule_status: result.passed ? 'passed' : 'rejected',
      reject_reason: result.reason,
    };
  });

  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await db.from('jm_jobs').upsert(rows.slice(i, i + INSERT_CHUNK), {
      onConflict: 'user_id,source,external_id',
      ignoreDuplicates: true,
    });
    if (error) stats.errors.push(`storing jobs failed: ${error.message}`);
  }
}

interface UnscoredJob {
  id: string;
  job: Job;
}

async function loadUnscored(
  db: SupabaseClient,
  userId: string,
  limit: number,
): Promise<UnscoredJob[]> {
  const { data: candidates, error } = await db
    .from('jm_jobs')
    .select(
      'id, source, external_id, title, company, location, remote, description, url, posted_at',
    )
    .eq('user_id', userId)
    .eq('rule_status', 'passed')
    .order('created_at', { ascending: false })
    .limit(400);
  if (error) throw new Error(`loading candidates failed: ${error.message}`);
  const ids = (candidates ?? []).map((row) => row.id);
  if (ids.length === 0) return [];
  const { data: matched } = await db.from('jm_job_matches').select('job_id').in('job_id', ids);
  const done = new Set((matched ?? []).map((row) => row.job_id));
  return (candidates ?? [])
    .filter((row) => !done.has(row.id))
    .slice(0, limit)
    .map((row) => ({
      id: row.id,
      job: {
        source: row.source,
        externalId: row.external_id,
        title: row.title,
        company: row.company,
        location: row.location,
        remote: row.remote,
        description: row.description,
        url: row.url,
        postedAt: row.posted_at,
      },
    }));
}

async function scoreJobs(
  db: SupabaseClient,
  env: WorkerEnv,
  userId: string,
  settings: UserSettings,
  profile: Profile,
  stats: RunStats,
): Promise<void> {
  const apiKey =
    settings.llm_provider === 'ollama'
      ? undefined
      : ((await getSecret(db, userId, 'llm')) ?? env.fallback.llmApiKey ?? undefined);
  if (settings.llm_provider !== 'ollama' && !apiKey) {
    stats.errors.push('no LLM API key configured, scoring skipped');
    return;
  }

  const queue = new LLMQueue({
    concurrency: settings.llm_concurrency,
    reserve: async () => {
      const { data, error } = await db.rpc('jm_bump_llm_usage', {
        p_user_id: userId,
        p_limit: settings.daily_llm_limit,
      });
      if (error) throw new Error(`usage counter failed: ${error.message}`);
      if (data) stats.llmCalls++;
      return data === true;
    },
  });
  const provider = createLLMProvider(
    {
      provider: settings.llm_provider,
      model: settings.llm_model ?? undefined,
      baseUrl: settings.llm_base_url ?? undefined,
      apiKey,
    },
    { fetchFn: fetch, queue },
  );

  const pending = await loadUnscored(db, userId, MAX_SCORE_PER_RUN);
  await Promise.all(
    pending.map(async ({ id, job }) => {
      if (queue.exhausted) return;
      try {
        const result = await provider.scoreJob(job, profile);
        const { error } = await db.from('jm_job_matches').insert({
          user_id: userId,
          job_id: id,
          score: result.score.score,
          analysis: result.score,
          model: result.model,
          prompt_version: result.promptVersion,
        });
        if (error) throw new Error(error.message);
        stats.scored++;
      } catch (error) {
        if (error instanceof DailyLimitReachedError) return;
        const message = errorText(error);
        stats.errors.push(`scoring ${job.company} / ${job.title}: ${message}`);
        await db
          .from('jm_job_matches')
          .insert({ user_id: userId, job_id: id, error: message.slice(0, 500) });
      }
    }),
  );
  if (queue.exhausted) stats.errors.push('daily LLM limit reached');
}

async function notifyMatches(
  db: SupabaseClient,
  env: WorkerEnv,
  userId: string,
  settings: UserSettings,
  stats: RunStats,
): Promise<void> {
  const token = (await getSecret(db, userId, 'telegram')) ?? env.fallback.telegramToken;
  const chatId = settings.telegram_chat_id ?? env.fallback.telegramChatId;
  if (!token || !chatId) return;

  const { data, error } = await db
    .from('jm_job_matches')
    .select('id, score, analysis, jm_jobs!inner(title, company, location, url)')
    .eq('user_id', userId)
    .is('notified_at', null)
    .is('error', null)
    .gte('score', settings.min_score)
    .order('score', { ascending: false })
    .limit(20);
  if (error) {
    stats.errors.push(`loading notifications failed: ${error.message}`);
    return;
  }

  for (const row of data ?? []) {
    const jobRef = row.jm_jobs as unknown as {
      title: string;
      company: string;
      location: string | null;
      url: string;
    };
    try {
      await sendTelegramMessage(
        token,
        chatId,
        formatMatchMessage(jobRef, row.analysis as MatchScore),
      );
      await db
        .from('jm_job_matches')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', row.id);
      stats.notified++;
      await new Promise((resolve) => setTimeout(resolve, 1100));
    } catch (err) {
      stats.errors.push(errorText(err).replace(token, '***'));
      break;
    }
  }
}

export async function shouldRun(
  db: SupabaseClient,
  userId: string,
  settings: UserSettings,
  force: boolean,
): Promise<boolean> {
  if (force) return true;
  const { data } = await db
    .from('jm_run_logs')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return true;
  const elapsedMs = Date.now() - new Date(data.started_at).getTime();
  return elapsedMs >= settings.frequency_hours * 3_600_000 - 10 * 60_000;
}

export async function runUser(
  db: SupabaseClient,
  env: WorkerEnv,
  settings: UserSettings,
): Promise<RunStats | null> {
  const userId = settings.user_id;
  if (!(await shouldRun(db, userId, settings, env.force))) return null;

  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const stats = emptyStats();

  try {
    const { data: profileRow } = await db
      .from('jm_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profileRow) throw new Error('profile not found');
    const profile = toProfile(profileRow as ProfileRow);

    await collectAndStore(db, userId, settings, profile, stats);
    await scoreJobs(db, env, userId, settings, profile, stats);
    await notifyMatches(db, env, userId, settings, stats);
  } catch (error) {
    stats.errors.push(errorText(error));
  }

  await db.from('jm_run_logs').insert({
    user_id: userId,
    started_at: startedAt,
    duration_ms: Date.now() - started,
    collected: stats.collected,
    new_jobs: stats.newJobs,
    filtered_out: stats.filteredOut,
    scored: stats.scored,
    notified: stats.notified,
    llm_calls: stats.llmCalls,
    errors: stats.errors.slice(0, 50),
  });
  return stats;
}
