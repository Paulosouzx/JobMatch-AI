import { describe, expect, it } from 'vitest';
import { formatMatchMessage, sendTelegramMessage } from './telegram';

const analysis = {
  score: 91,
  reasons: ['Stack <match>', 'Remote', 'Senior level', 'Ignored fourth reason'],
  matched_skills: [],
  missing_skills: [],
  seniority_fit: 'good',
  location_fit: 'good',
  summary: 'ok',
};

describe('formatMatchMessage', () => {
  it('escapes HTML, limits reasons to three and includes link and score', () => {
    const message = formatMatchMessage(
      { title: 'Dev & Ops', company: 'Acme', location: 'Porto', url: 'https://x.test/j?a=1&b=2' },
      analysis,
    );
    expect(message).toContain('<b>Dev &amp; Ops</b>');
    expect(message).toContain('Stack &lt;match&gt;');
    expect(message).not.toContain('Ignored fourth reason');
    expect(message).toContain('91/100');
    expect(message).toContain('href="https://x.test/j?a=1&amp;b=2"');
  });
});

describe('sendTelegramMessage', () => {
  it('posts to the bot endpoint and surfaces API errors without the token', async () => {
    let calledUrl = '';
    const ok = async (url: string | URL | Request) => {
      calledUrl = String(url);
      return new Response('{}', { status: 200 });
    };
    await sendTelegramMessage('TOKEN', '42', 'hi', ok as typeof fetch);
    expect(calledUrl).toBe('https://api.telegram.org/botTOKEN/sendMessage');

    const bad = async () =>
      new Response(JSON.stringify({ description: 'chat not found' }), { status: 400 });
    await expect(sendTelegramMessage('TOKEN', '42', 'hi', bad as typeof fetch)).rejects.toThrow(
      'chat not found',
    );
  });
});
