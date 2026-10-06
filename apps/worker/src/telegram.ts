import type { MatchScore } from '@jobmatch/core';

export interface NotifyJob {
  title: string;
  company: string;
  location: string | null;
  url: string;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatMatchMessage(job: NotifyJob, analysis: MatchScore): string {
  const reasons = analysis.reasons
    .slice(0, 3)
    .map((reason) => `• ${escapeHtml(reason)}`)
    .join('\n');
  const where = job.location ? ` · ${escapeHtml(job.location)}` : '';
  return [
    `<b>${escapeHtml(job.title)}</b>`,
    `${escapeHtml(job.company)}${where}`,
    `Score: <b>${analysis.score}/100</b>`,
    '',
    reasons,
    '',
    `<a href="${escapeHtml(job.url)}">Open job</a>`,
  ].join('\n');
}

export class TelegramError extends Error {}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const response = await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { description?: string };
    throw new TelegramError(
      `Telegram ${response.status}: ${payload.description ?? 'request failed'}`,
    );
  }
}
