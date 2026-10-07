import { describe, expect, it } from 'vitest';
import { jsonResponse, makeJob, makeProfile } from '../test-helpers';
import type { ChatClient, CompletionRequest } from './clients';
import { createChatClient } from './clients';
import { DailyLimitReachedError, LLMParseError, RateLimitError } from './errors';
import { createLLMProvider, extractJson, parseScore } from './provider';
import { LLMQueue } from './queue';
import { stripPii } from './sanitize';

const validScore = {
  score: 88,
  reasons: ['Matches TypeScript stack', 'Remote friendly'],
  matched_skills: ['typescript', 'react'],
  missing_skills: ['go'],
  seniority_fit: 'good',
  location_fit: 'good',
  summary: 'Strong fit.',
};

function scriptedClient(outputs: (string | Error)[]) {
  const requests: CompletionRequest[] = [];
  const client: ChatClient = {
    async complete(request) {
      requests.push(request);
      const next = outputs.shift();
      if (next === undefined) throw new Error('no more scripted outputs');
      if (next instanceof Error) throw next;
      return next;
    },
  };
  return { client, requests };
}

const noFetch = async () => {
  throw new Error('network must not be used');
};

describe('parsing', () => {
  it('extracts JSON from fenced or noisy output', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Sure! {"a":1} hope it helps')).toEqual({ a: 1 });
    expect(() => extractJson('nothing here')).toThrow();
    expect(extractJson('<think>maybe {"x": 2} is wrong</think>\n{"a":1}')).toEqual({ a: 1 });
  });

  it('validates score payloads', () => {
    expect('score' in parseScore(JSON.stringify(validScore))).toBe(true);
    const bad = parseScore(JSON.stringify({ ...validScore, score: 150 }));
    expect('problem' in bad && bad.problem).toContain('score');
    expect('problem' in parseScore('not json')).toBe(true);
  });
});

describe('createLLMProvider with a mock client', () => {
  it('scores a job and strips PII from the CV before sending', async () => {
    const { client, requests } = scriptedClient([JSON.stringify(validScore)]);
    const provider = createLLMProvider(
      { provider: 'gemini', apiKey: 'k' },
      { fetchFn: noFetch, client },
    );
    const result = await provider.scoreJob(makeJob(), makeProfile());
    expect(result.score.score).toBe(88);
    expect(result.promptVersion).toBe('score.v2');
    const sent = requests[0]!.user;
    expect(sent).not.toContain('jane@example.com');
    expect(sent).not.toContain('912 345 678');
    expect(sent).toContain('TypeScript');
  });

  it('retries once with a repair instruction when the JSON is invalid', async () => {
    const { client, requests } = scriptedClient(['{"score": "high"}', JSON.stringify(validScore)]);
    const provider = createLLMProvider({ provider: 'groq' }, { fetchFn: noFetch, client });
    const result = await provider.scoreJob(makeJob(), makeProfile());
    expect(result.score.score).toBe(88);
    expect(requests).toHaveLength(2);
    expect(requests[1]!.user).toContain('previous answer was not valid');
  });

  it('throws LLMParseError when the retry is also invalid', async () => {
    const { client } = scriptedClient(['nope', 'still nope']);
    const provider = createLLMProvider({ provider: 'groq' }, { fetchFn: noFetch, client });
    await expect(provider.scoreJob(makeJob(), makeProfile())).rejects.toBeInstanceOf(LLMParseError);
  });

  it('drafts a cover letter as plain text', async () => {
    const { client, requests } = scriptedClient([
      '<think>plan the letter</think>\n  Dear team, ...  ',
    ]);
    const provider = createLLMProvider({ provider: 'ollama' }, { fetchFn: noFetch, client });
    const letter = await provider.draftCoverLetter(makeJob(), makeProfile());
    expect(letter.text).toBe('Dear team, ...');
    expect(requests[0]!.json).toBe(false);
  });

  it('reports connection success and failure', async () => {
    const ok = createLLMProvider(
      { provider: 'gemini' },
      { fetchFn: noFetch, client: scriptedClient(['OK']).client },
    );
    expect((await ok.testConnection()).ok).toBe(true);
    const failing = createLLMProvider(
      { provider: 'gemini' },
      { fetchFn: noFetch, client: scriptedClient([new Error('401 invalid key')]).client },
    );
    const result = await failing.testConnection();
    expect(result.ok).toBe(false);
    expect(result.message).toContain('401');
  });
});

describe('provider HTTP clients', () => {
  it('calls Gemini with the key in a header and parses the response', async () => {
    let seen: { url: string; headers: Record<string, string> } | undefined;
    const client = createChatClient({ provider: 'gemini', apiKey: 'gk' }, async (url, init) => {
      seen = { url, headers: init?.headers as Record<string, string> };
      return jsonResponse({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] });
    });
    expect(await client.complete({ system: 's', user: 'u', json: false })).toBe('hello');
    expect(seen?.url).not.toContain('gk');
    expect(seen?.headers['x-goog-api-key']).toBe('gk');
  });

  it('calls OpenAI-compatible providers and maps 429 to RateLimitError', async () => {
    const ok = createChatClient({ provider: 'groq', apiKey: 'k' }, async () =>
      jsonResponse({ choices: [{ message: { content: 'hi' } }] }),
    );
    expect(await ok.complete({ system: 's', user: 'u', json: true })).toBe('hi');
    const limited = createChatClient({ provider: 'openrouter', apiKey: 'k' }, async () =>
      jsonResponse({}, 429, { 'retry-after': '2' }),
    );
    const error = await limited.complete({ system: 's', user: 'u', json: true }).catch((e) => e);
    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(2000);
  });

  it('uses the configured Ollama base URL without requiring a key', async () => {
    let url = '';
    const client = createChatClient(
      { provider: 'ollama', baseUrl: 'http://box:11434/' },
      async (input) => {
        url = input;
        return jsonResponse({ choices: [{ message: { content: 'x' } }] });
      },
    );
    await client.complete({ system: 's', user: 'u', json: false });
    expect(url).toBe('http://box:11434/v1/chat/completions');
  });
});

describe('LLMQueue', () => {
  it('retries 429s with exponential backoff', async () => {
    const delays: number[] = [];
    const queue = new LLMQueue({
      concurrency: 1,
      baseDelayMs: 100,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    let attempts = 0;
    const result = await queue.run(async () => {
      attempts++;
      if (attempts < 4) throw new RateLimitError('slow down');
      return 'done';
    });
    expect(result).toBe('done');
    expect(delays).toEqual([100, 200, 400]);
  });

  it('honours Retry-After and gives up after max retries', async () => {
    const delays: number[] = [];
    const queue = new LLMQueue({
      concurrency: 1,
      maxRetries: 1,
      sleep: async (ms) => {
        delays.push(ms);
      },
    });
    await expect(
      queue.run(async () => {
        throw new RateLimitError('x', 5000);
      }),
    ).rejects.toBeInstanceOf(RateLimitError);
    expect(delays).toEqual([5000]);
  });

  it('stops once the daily limit is reached', async () => {
    let budget = 2;
    const queue = new LLMQueue({ concurrency: 1, reserve: async () => budget-- > 0 });
    await queue.run(async () => 1);
    await queue.run(async () => 2);
    await expect(queue.run(async () => 3)).rejects.toBeInstanceOf(DailyLimitReachedError);
    expect(queue.exhausted).toBe(true);
    await expect(queue.run(async () => 4)).rejects.toBeInstanceOf(DailyLimitReachedError);
  });

  it('never exceeds the configured concurrency', async () => {
    const queue = new LLMQueue({ concurrency: 2 });
    let running = 0;
    let peak = 0;
    const task = async () => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;
    };
    await Promise.all(Array.from({ length: 6 }, () => queue.run(task)));
    expect(peak).toBe(2);
  });
});

describe('stripPii', () => {
  it('removes emails, phones and address lines', () => {
    const output = stripPii(
      'Jane\njane@example.com\n+351 912 345 678\nRua das Flores 123, 4000-001 Porto\nSkills: TypeScript',
    );
    expect(output).not.toContain('jane@example.com');
    expect(output).not.toContain('912 345 678');
    expect(output).not.toContain('Rua das Flores');
    expect(output).toContain('Skills: TypeScript');
  });
});

describe('extractProfile', () => {
  const extracted = {
    skills: ['TypeScript', 'React'],
    seniority: 'senior',
    location: 'Porto, Portugal',
    work_modes: ['remote'],
    keywords: ['frontend', 'react'],
    headline: 'Frontend engineer',
  };

  it('extracts and validates profile fields, stripping PII first', async () => {
    const { client, requests } = scriptedClient([JSON.stringify(extracted)]);
    const provider = createLLMProvider({ provider: 'groq' }, { fetchFn: noFetch, client });
    const result = await provider.extractProfile(
      'Jane\njane@example.com\nSenior React dev in Porto',
    );
    expect(result.profile.seniority).toBe('senior');
    expect(result.promptVersion).toBe('profile-extract.v1');
    expect(requests[0]!.user).not.toContain('jane@example.com');
  });

  it('repairs an invalid seniority value once', async () => {
    const { client, requests } = scriptedClient([
      JSON.stringify({ ...extracted, seniority: 'expert' }),
      JSON.stringify(extracted),
    ]);
    const provider = createLLMProvider({ provider: 'groq' }, { fetchFn: noFetch, client });
    expect((await provider.extractProfile('cv')).profile.skills).toEqual(['TypeScript', 'React']);
    expect(requests).toHaveLength(2);
  });
});
