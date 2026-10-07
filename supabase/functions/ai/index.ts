import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import {
  createLLMProvider,
  DEFAULT_STYLE_GUIDE,
  reviewAdaptation,
  type StyleGuide,
} from '../_shared/core.js';
import { json, preflight, readBody } from '../_shared/http.ts';
import { loadLlmConfig } from '../_shared/llm-config.ts';

interface JobRow {
  id: string;
  source: string;
  external_id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  description: string;
  url: string;
  posted_at: string | null;
}

async function loadStyleGuide(db: SupabaseClient, userId: string): Promise<StyleGuide> {
  const { data } = await db
    .from('jm_style_guides')
    .select('rules, banned_phrases, samples')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return DEFAULT_STYLE_GUIDE;
  return {
    rules: data.rules?.length ? data.rules : DEFAULT_STYLE_GUIDE.rules,
    bannedPhrases: data.banned_phrases ?? DEFAULT_STYLE_GUIDE.bannedPhrases,
    samples: data.samples ?? [],
  };
}

async function loadJob(db: SupabaseClient, userId: string, jobId: string) {
  const { data } = await db
    .from('jm_jobs')
    .select(
      'id, source, external_id, title, company, location, remote, description, url, posted_at',
    )
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();
  return data as JobRow | null;
}

function toJob(row: JobRow) {
  return {
    source: row.source,
    externalId: row.external_id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote,
    description: row.description,
    url: row.url,
    postedAt: row.posted_at,
  };
}

async function loadProfile(db: SupabaseClient, userId: string) {
  const { data } = await db.from('jm_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (!data) return null;
  return {
    cvText: data.cv_text,
    skills: data.skills,
    seniority: data.seniority,
    location: data.location,
    workModes: data.work_modes,
    mustKeywords: data.must_keywords,
    excludeKeywords: data.exclude_keywords,
    ignoredCompanies: data.ignored_companies,
  };
}

async function loadAnalysis(db: SupabaseClient, jobId: string) {
  const { data } = await db
    .from('jm_job_matches')
    .select('analysis')
    .eq('job_id', jobId)
    .maybeSingle();
  return (data?.analysis ?? null) as Record<string, unknown> | null;
}

function jobSummary(job: JobRow, analysis: Record<string, unknown> | null): string {
  const list = (value: unknown) =>
    Array.isArray(value) ? value.filter((v) => typeof v === 'string') : [];
  const required = list(analysis?.requirements_required);
  const nice = list(analysis?.requirements_nice);
  return [
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    required.length ? `Required: ${required.join('; ')}` : '',
    nice.length ? `Nice to have: ${nice.join('; ')}` : '',
    '',
    job.description.slice(0, 3000),
  ]
    .filter((line, index) => line !== '' || index === 4)
    .join('\n');
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const body = await readBody(req);
  const action = typeof body.action === 'string' ? body.action : '';
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  const db = serviceClient();

  const loaded = await loadLlmConfig(db, userId);
  if ('error' in loaded) return json({ error: loaded.error }, 400);

  const { data: allowed } = await db.rpc('jm_bump_llm_usage', {
    p_user_id: userId,
    p_limit: loaded.dailyLimit,
  });
  if (!allowed) return json({ error: 'Daily LLM call limit reached' }, 429);

  const provider = createLLMProvider(loaded.config, { fetchFn: fetch });

  try {
    if (action === 'analyze-job') {
      const job = await loadJob(db, userId, jobId);
      const profile = await loadProfile(db, userId);
      if (!job || !profile) return json({ error: 'Job or profile not found' }, 404);
      const result = await provider.scoreJob(toJob(job), profile);
      const { error } = await db.from('jm_job_matches').upsert(
        {
          user_id: userId,
          job_id: job.id,
          score: result.score.score,
          analysis: result.score,
          model: result.model,
          prompt_version: result.promptVersion,
          error: null,
        },
        { onConflict: 'job_id' },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ analysis: result.score });
    }

    if (action === 'adapt-resume') {
      const job = await loadJob(db, userId, jobId);
      if (!job) return json({ error: 'Job not found' }, 404);
      const { data: template } = await db
        .from('jm_resume_templates')
        .select('fields, adaptable')
        .eq('user_id', userId)
        .maybeSingle();
      if (!template) return json({ error: 'Resume template not found' }, 404);
      const fields = template.fields as Record<string, string>;
      const adaptable = Object.fromEntries(
        (template.adaptable as string[])
          .filter((key) => typeof fields[key] === 'string' && fields[key].trim() !== '')
          .map((key) => [key, fields[key]]),
      );
      if (Object.keys(adaptable).length === 0)
        return json({ error: 'No adaptable fields selected' }, 400);
      const guide = await loadStyleGuide(db, userId);
      const analysis = await loadAnalysis(db, job.id);
      const result = await provider.adaptResume(adaptable, jobSummary(job, analysis), guide);
      const review = reviewAdaptation(adaptable, result.proposed, {
        bannedPhrases: guide.bannedPhrases,
      });
      const { data: version, error } = await db
        .from('jm_resume_versions')
        .insert({
          user_id: userId,
          job_id: job.id,
          base_fields: fields,
          review: review.fields,
          model: result.model,
          prompt_version: result.promptVersion,
        })
        .select('id')
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({
        versionId: version.id,
        extraKeys: review.extraKeys,
        missingKeys: review.missingKeys,
      });
    }

    if (action === 'fix-text') {
      const sentences = Array.isArray(body.sentences)
        ? body.sentences.filter((value): value is string => typeof value === 'string').slice(0, 20)
        : [];
      if (sentences.length === 0) return json({ error: 'No sentences to fix' }, 400);
      const guide = await loadStyleGuide(db, userId);
      const fixed = await provider.fixSentences(sentences, guide.bannedPhrases, guide);
      return json({ sentences: fixed });
    }

    if (action === 'cover-letter') {
      const job = await loadJob(db, userId, jobId);
      const profile = await loadProfile(db, userId);
      if (!job || !profile) return json({ error: 'Job or profile not found' }, 404);
      const guide = await loadStyleGuide(db, userId);
      const analysis = await loadAnalysis(db, job.id);
      const language = typeof analysis?.language === 'string' ? analysis.language : undefined;
      const letter = await provider.draftCoverLetter(toJob(job), profile, {
        styleGuide: guide,
        language,
      });
      await db
        .from('jm_applications')
        .upsert(
          { user_id: userId, job_id: job.id, cover_letter: letter.text },
          { onConflict: 'job_id' },
        );
      return json({ text: letter.text });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'LLM request failed' }, 502);
  }
});
