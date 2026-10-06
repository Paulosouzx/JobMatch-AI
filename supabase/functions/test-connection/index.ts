import { requireUser, serviceClient } from '../_shared/auth.ts';
import { createLLMProvider } from '../_shared/core.js';
import { json, preflight, readBody } from '../_shared/http.ts';
import { loadLlmConfig } from '../_shared/llm-config.ts';
import { listModels } from '../_shared/models.ts';
import { sendPushToUser } from '../_shared/push.ts';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const body = await readBody(req);

  if (body.target === 'push') {
    const result = await sendPushToUser(serviceClient(), userId, {
      title: 'JobMatch AI',
      body: 'Notificação de teste. Está tudo a funcionar.',
      url: '/app/settings',
      tag: 'jobmatch-test',
    });
    return json(
      result.sent > 0
        ? { ok: true, message: `Notificação enviada para ${result.sent} dispositivo(s).` }
        : { ok: false, message: result.error ?? 'Falha ao enviar' },
    );
  }

  if (body.target === 'models') {
    const loaded = await loadLlmConfig(serviceClient(), userId);
    if ('error' in loaded) return json({ ok: false, message: loaded.error, models: [] });
    try {
      return json({ ok: true, models: await listModels(loaded.config) });
    } catch (error) {
      return json({
        ok: false,
        message: error instanceof Error ? error.message : String(error),
        models: [],
      });
    }
  }

  if (body.target === 'llm') {
    const loaded = await loadLlmConfig(serviceClient(), userId);
    if ('error' in loaded) return json({ ok: false, message: loaded.error });
    const provider = createLLMProvider(loaded.config, { fetchFn: fetch });
    return json(await provider.testConnection());
  }

  return json({ error: 'Invalid target' }, 400);
});
