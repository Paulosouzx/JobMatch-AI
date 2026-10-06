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
  const cvText = typeof body.cvText === 'string' ? body.cvText.trim() : '';
  if (cvText.length < 80) return json({ error: 'CV text is too short' }, 400);

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
    const result = await provider.extractProfile(cvText);
    return json({ profile: result.profile, model: result.model });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'LLM request failed' }, 502);
  }
});
