import type { FetchLike } from '../collectors/types';
import {
  buildCoverLetterUserPrompt,
  COVER_LETTER_PROMPT_VERSION,
  COVER_LETTER_SYSTEM_PROMPT,
} from '../prompts/cover-letter.v1';
import {
  buildRepairPrompt,
  buildScoreUserPrompt,
  SCORE_PROMPT_VERSION,
  SCORE_SYSTEM_PROMPT,
} from '../prompts/score.v1';
import { matchScoreSchema, type Job, type MatchScore, type Profile } from '../types';
import { createChatClient, DEFAULT_MODELS, type ChatClient, type LLMConfig } from './clients';
import { LLMParseError } from './errors';
import type { LLMQueue } from './queue';
import { stripPii } from './sanitize';

export interface ScoreResult {
  score: MatchScore;
  model: string;
  promptVersion: string;
}

export interface CoverLetterResult {
  text: string;
  model: string;
  promptVersion: string;
}

export interface ConnectionResult {
  ok: boolean;
  message: string;
}

export interface LLMProvider {
  scoreJob(job: Job, profile: Profile): Promise<ScoreResult>;
  draftCoverLetter(job: Job, profile: Profile): Promise<CoverLetterResult>;
  testConnection(): Promise<ConnectionResult>;
}

export interface ProviderOptions {
  fetchFn: FetchLike;
  queue?: LLMQueue;
  language?: string;
  client?: ChatClient;
}

export function stripReasoning(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\S]*?<\/think>/i, '')
    .trim();
}

export function extractJson(text: string): unknown {
  const trimmed = stripReasoning(text);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object found');
  return JSON.parse(candidate.slice(start, end + 1));
}

export function parseScore(text: string): { score: MatchScore } | { problem: string } {
  let data: unknown;
  try {
    data = extractJson(text);
  } catch (error) {
    return { problem: `output is not valid JSON (${(error as Error).message})` };
  }
  const result = matchScoreSchema.safeParse(data);
  if (result.success) return { score: result.data };
  const problem = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ');
  return { problem };
}

export function createLLMProvider(config: LLMConfig, options: ProviderOptions): LLMProvider {
  const client = options.client ?? createChatClient(config, options.fetchFn);
  const model = config.model || DEFAULT_MODELS[config.provider];
  const language = options.language ?? 'Brazilian Portuguese';
  const call = <T>(task: () => Promise<T>) => (options.queue ? options.queue.run(task) : task());

  return {
    async scoreJob(job, profile) {
      const cvText = stripPii(profile.cvText).slice(0, 8000);
      const user = buildScoreUserPrompt(job, profile, cvText, language);
      const first = await call(() =>
        client.complete({ system: SCORE_SYSTEM_PROMPT, user, json: true }),
      );
      const parsed = parseScore(first);
      if ('score' in parsed) {
        return { score: parsed.score, model, promptVersion: SCORE_PROMPT_VERSION };
      }
      const second = await call(() =>
        client.complete({
          system: SCORE_SYSTEM_PROMPT,
          user: `${user}\n\n${buildRepairPrompt(first, parsed.problem)}`,
          json: true,
          temperature: 0,
        }),
      );
      const retried = parseScore(second);
      if ('score' in retried) {
        return { score: retried.score, model, promptVersion: SCORE_PROMPT_VERSION };
      }
      throw new LLMParseError(`Invalid LLM output after retry: ${retried.problem}`, second);
    },

    async draftCoverLetter(job, profile) {
      const cvText = stripPii(profile.cvText).slice(0, 8000);
      const text = await call(() =>
        client.complete({
          system: COVER_LETTER_SYSTEM_PROMPT,
          user: buildCoverLetterUserPrompt(job, profile, cvText, language),
          json: false,
          temperature: 0.6,
        }),
      );
      return { text: stripReasoning(text), model, promptVersion: COVER_LETTER_PROMPT_VERSION };
    },

    async testConnection() {
      try {
        const reply = await client.complete({
          system: 'Reply with the single word OK.',
          user: 'ping',
          json: false,
          temperature: 0,
        });
        return {
          ok: true,
          message: `Connected to ${config.provider} (${model}): ${stripReasoning(reply).slice(0, 40)}`,
        };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}
