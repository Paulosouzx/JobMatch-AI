import { requireUser, serviceClient } from '../_shared/auth.ts';
import { json, preflight, readBody } from '../_shared/http.ts';

const KINDS = ['llm', 'telegram', 'adzuna', 'itjobs'];

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const userId = await requireUser(req);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  const body = await readBody(req);
  const kind = typeof body.kind === 'string' ? body.kind : '';
  const action = body.action === 'delete' ? 'delete' : 'set';
  if (!KINDS.includes(kind)) return json({ error: 'Invalid secret kind' }, 400);

  const db = serviceClient();

  if (action === 'delete') {
    const { error } = await db.rpc('jm_delete_user_secret', { p_user_id: userId, p_kind: kind });
    return error ? json({ error: 'Could not remove secret' }, 500) : json({ removed: true });
  }

  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (value.length < 4 || value.length > 2000) {
    return json({ error: 'Invalid secret value' }, 400);
  }
  const { error } = await db.rpc('jm_set_user_secret', {
    p_user_id: userId,
    p_kind: kind,
    p_value: value,
  });
  if (error) return json({ error: 'Could not save secret' }, 500);
  return json({ last4: value.slice(-4) });
});
