import type { MatchScore } from '@jobmatch/core';
import webpush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

export interface NotifyJob {
  title: string;
  company: string;
  location: string | null;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function formatMatchNotification(
  jobId: string,
  job: NotifyJob,
  analysis: MatchScore,
): PushPayload {
  const where = job.location ? ` · ${job.location}` : '';
  const reasons = analysis.reasons.slice(0, 2).join(' · ');
  return {
    title: truncate(`${analysis.score} · ${job.title}`, 80),
    body: truncate(`${job.company}${where}${reasons ? `\n${reasons}` : ''}`, 220),
    url: `/app/jobs/${jobId}`,
    tag: `jobmatch-${jobId}`,
  };
}

export function formatSummaryNotification(extra: number): PushPayload {
  return {
    title: 'JobMatch AI',
    body: `E mais ${extra} ${extra === 1 ? 'vaga relevante' : 'vagas relevantes'} à tua espera.`,
    url: '/app',
    tag: 'jobmatch-summary',
  };
}

export type SendResult = 'sent' | 'expired' | 'failed';

export interface PushSender {
  send(subscription: PushSubscriptionRow, payload: PushPayload): Promise<SendResult>;
  lastError: string | null;
}

export function createPushSender(vapid: VapidConfig): PushSender {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  const sender: PushSender = {
    lastError: null,
    async send(subscription, payload) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
          { TTL: 86400 },
        );
        return 'sent';
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) return 'expired';
        sender.lastError = error instanceof Error ? error.message : String(error);
        return 'failed';
      }
    },
  };
  return sender;
}
