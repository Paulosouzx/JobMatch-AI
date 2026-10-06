import { requireUser, serviceClient } from '../_shared/auth.ts';
import { createLLMProvider } from '../_shared/core.js';
import { json, preflight, readBody } from '../_shared/http.ts';
import { loadLlmConfig } from '../_shared/llm-config.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const body = await readBody(req);
  const jobId = typeof body.jobId === 'string' ? body.jobId : '';
  if (!jobId) return json({ error: 'jobId is required' }, 400);

  const db = serviceClient();
  const { data: row } = await db
    .from('jm_jobs')
    .select('source, external_id, title, company, location, remote, description, url, posted_at')
    .eq('id', jobId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!row) return json({ error: 'Job not found' }, 404);

  const { data: profileRow } = await db
    .from('jm_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!profileRow) return json({ error: 'Profile not found' }, 404);

  const loaded = await loadLlmConfig(db, userId);
  if ('error' in loaded) return json({ error: loaded.error }, 400);

  const { data: allowed } = await db.rpc('jm_bump_llm_usage', {
    p_user_id: userId,
    p_limit: loaded.dailyLimit,
  });
  if (!allowed) return json({ error: 'Daily LLM call limit reached' }, 429);

  const provider = createLLMProvider(loaded.config, { fetchFn: fetch });
  try {
    const letter = await provider.draftCoverLetter(
      {
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
      {
        cvText: profileRow.cv_text,
        skills: profileRow.skills,
        seniority: profileRow.seniority,
        location: profileRow.location,
        workModes: profileRow.work_modes,
        mustKeywords: profileRow.must_keywords,
        excludeKeywords: profileRow.exclude_keywords,
        ignoredCompanies: profileRow.ignored_companies,
      },
    );
    await db
      .from('jm_applications')
      .upsert(
        { user_id: userId, job_id: jobId, cover_letter: letter.text },
        { onConflict: 'job_id' },
      );
    return json({ text: letter.text });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'LLM request failed' }, 502);
  }
});
