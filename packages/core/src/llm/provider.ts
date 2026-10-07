import type { FetchLike } from '../collectors/types';
import {
  buildCoverLetterSystemPrompt,
  buildCoverLetterUserPrompt,
  COVER_LETTER_PROMPT_VERSION,
} from '../prompts/cover-letter.v1';
import { buildFixTextSystemPrompt, buildFixTextUserPrompt } from '../prompts/fix-text.v1';
import {
  buildResumeAdaptSystemPrompt,
  buildResumeAdaptUserPrompt,
  RESUME_ADAPT_PROMPT_VERSION,
} from '../prompts/resume-adapt.v1';
import { formatStyleGuide, replaceDashes, type StyleGuide } from '../style/style-guide';
import {
  buildRepairPrompt,
  buildScoreUserPrompt,
  SCORE_PROMPT_VERSION,
  SCORE_SYSTEM_PROMPT,
} from '../prompts/score.v1';
import {
  extractedProfileSchema,
  matchScoreSchema,
  type ExtractedProfile,
  type Job,
  type MatchScore,
  type Profile,
} from '../types';
import {
  buildProfileExtractUserPrompt,
  PROFILE_EXTRACT_PROMPT_VERSION,
  PROFILE_EXTRACT_SYSTEM_PROMPT,
} from '../prompts/profile-extract.v1';
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

export interface ProfileExtractResult {
  profile: ExtractedProfile;
  model: string;
  promptVersion: string;
}

export interface WritingOptions {
  styleGuide?: StyleGuide;
  language?: string;
}

export interface AdaptResult {
  proposed: unknown;
  model: string;
  promptVersion: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  pt: 'Portuguese (Portugal)',
  'pt-br': 'Brazilian Portuguese',
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  nl: 'Dutch',
};

export function languageName(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code;
}

export interface LLMProvider {
  scoreJob(job: Job, profile: Profile): Promise<ScoreResult>;
  extractProfile(cvText: string): Promise<ProfileExtractResult>;
  draftCoverLetter(
    job: Job,
    profile: Profile,
    options?: WritingOptions,
  ): Promise<CoverLetterResult>;
  adaptResume(
    fields: Record<string, string>,
    jobSummary: string,
    styleGuide?: StyleGuide,
  ): Promise<AdaptResult>;
  fixSentences(sentences: string[], banned: string[], styleGuide?: StyleGuide): Promise<string[]>;
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

function parseWith<T>(
  schema: {
    safeParse: (
      data: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  },
  text: string,
): { value: T } | { problem: string } {
  let data: unknown;
  try {
    data = extractJson(text);
  } catch (error) {
    return { problem: `output is not valid JSON (${(error as Error).message})` };
  }
  const result = schema.safeParse(data);
  if (result.success) return { value: result.data };
  return {
    problem: result.error.issues
      .map((issue) => `${issue.path.map(String).join('.') || 'root'}: ${issue.message}`)
      .join('; '),
  };
}

export function parseExtractedProfile(
  text: string,
): { profile: ExtractedProfile } | { problem: string } {
  const parsed = parseWith(extractedProfileSchema, text);
  return 'value' in parsed ? { profile: parsed.value } : parsed;
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

    async extractProfile(rawCv) {
      const user = buildProfileExtractUserPrompt(stripPii(rawCv));
      const first = await call(() =>
        client.complete({
          system: PROFILE_EXTRACT_SYSTEM_PROMPT,
          user,
          json: true,
          temperature: 0,
        }),
      );
      const parsed = parseExtractedProfile(first);
      if ('profile' in parsed) {
        return { profile: parsed.profile, model, promptVersion: PROFILE_EXTRACT_PROMPT_VERSION };
      }
      const second = await call(() =>
        client.complete({
          system: PROFILE_EXTRACT_SYSTEM_PROMPT,
          user: `${user}\n\n${buildRepairPrompt(first, parsed.problem)}`,
          json: true,
          temperature: 0,
        }),
      );
      const retried = parseExtractedProfile(second);
      if ('profile' in retried) {
        return { profile: retried.profile, model, promptVersion: PROFILE_EXTRACT_PROMPT_VERSION };
      }
      throw new LLMParseError(`Invalid LLM output after retry: ${retried.problem}`, second);
    },

    async draftCoverLetter(job, profile, writing) {
      const cvText = stripPii(profile.cvText).slice(0, 8000);
      const guide = writing?.styleGuide ? formatStyleGuide(writing.styleGuide) : undefined;
      const text = await call(() =>
        client.complete({
          system: buildCoverLetterSystemPrompt(guide),
          user: buildCoverLetterUserPrompt(
            job,
            profile,
            cvText,
            languageName(writing?.language, language),
          ),
          json: false,
          temperature: 0.5,
        }),
      );
      return {
        text: replaceDashes(stripReasoning(text)),
        model,
        promptVersion: COVER_LETTER_PROMPT_VERSION,
      };
    },

    async adaptResume(fields, jobSummary, styleGuide) {
      const system = buildResumeAdaptSystemPrompt(styleGuide ? formatStyleGuide(styleGuide) : '');
      const user = buildResumeAdaptUserPrompt(jobSummary, fields);
      const first = await call(() =>
        client.complete({ system, user, json: true, temperature: 0.3 }),
      );
      try {
        return { proposed: extractJson(first), model, promptVersion: RESUME_ADAPT_PROMPT_VERSION };
      } catch (error) {
        const second = await call(() =>
          client.complete({
            system,
            user: `${user}\n\n${buildRepairPrompt(first, (error as Error).message)}`,
            json: true,
            temperature: 0,
          }),
        );
        try {
          return {
            proposed: extractJson(second),
            model,
            promptVersion: RESUME_ADAPT_PROMPT_VERSION,
          };
        } catch (retryError) {
          throw new LLMParseError(
            `Invalid LLM output after retry: ${(retryError as Error).message}`,
            second,
          );
        }
      }
    },

    async fixSentences(sentences, banned, styleGuide) {
      const system = buildFixTextSystemPrompt(styleGuide ? formatStyleGuide(styleGuide) : '');
      const text = await call(() =>
        client.complete({
          system,
          user: buildFixTextUserPrompt(sentences, banned),
          json: true,
          temperature: 0.2,
        }),
      );
      const data = extractJson(text) as { sentences?: unknown };
      const fixed = Array.isArray(data.sentences) ? data.sentences : [];
      if (fixed.length !== sentences.length || fixed.some((value) => typeof value !== 'string')) {
        throw new LLMParseError('The model did not return one sentence per input sentence', text);
      }
      return (fixed as string[]).map((value) => replaceDashes(value.trim()));
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
