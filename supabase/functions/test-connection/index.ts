import { requireUser, serviceClient } from '../_shared/auth.ts';
import { createLLMProvider } from '../_shared/core.js';
import { json, preflight, readBody } from '../_shared/http.ts';
import { loadLlmConfig } from '../_shared/llm-config.ts';

async function testTelegram(userId: string) {
  const db = serviceClient();
  const { data: settings } = await db
    .from('jm_settings')
    .select('telegram_chat_id')
    .eq('user_id', userId)
    .maybeSingle();
  const { data: token } = await db.rpc('jm_get_user_secret', {
    p_user_id: userId,
    p_kind: 'telegram',
  });
  if (!settings?.telegram_chat_id || typeof token !== 'string') {
    return { ok: false, message: 'Telegram token or chat ID missing' };
  }
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: settings.telegram_chat_id,
      text: 'JobMatch AI: test message. Notifications are working.',
    }),
  });
  if (response.ok) return { ok: true, message: 'Test message sent' };
  const payload = await response.json().catch(() => ({}));
  return { ok: false, message: `Telegram error: ${payload.description ?? response.status}` };
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const body = await readBody(req);

  if (body.target === 'telegram') return json(await testTelegram(userId));

  if (body.target === 'llm') {
    const loaded = await loadLlmConfig(serviceClient(), userId);
    if ('error' in loaded) return json({ ok: false, message: loaded.error });
    const provider = createLLMProvider(loaded.config, { fetchFn: fetch });
    return json(await provider.testConnection());
  }

  return json({ error: 'Invalid target' }, 400);
});
