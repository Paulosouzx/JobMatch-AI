import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export async function sendPushToUser(
  db: SupabaseClient,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; error?: string }> {
  const { data: config } = await db.rpc('jm_vapid_config').maybeSingle();
  const vapid = config as {
    public_key: string | null;
    private_key: string | null;
    subject: string;
  } | null;
  if (!vapid?.public_key || !vapid.private_key)
    return { sent: 0, error: 'VAPID keys are not configured' };
  webpush.setVapidDetails(vapid.subject, vapid.public_key, vapid.private_key);

  const { data: subscriptions } = await db
    .from('jm_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);
  if (!subscriptions || subscriptions.length === 0)
    return { sent: 0, error: 'No device has notifications enabled' };

  let sent = 0;
  let lastError: string | undefined;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 86400 },
      );
      sent++;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db.from('jm_push_subscriptions').delete().eq('id', sub.id);
      } else {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }
  }
  return { sent, error: sent === 0 ? (lastError ?? 'All subscriptions expired') : undefined };
}
