import type { FetchLike } from '../collectors/types';
import { LLMRequestError, RateLimitError } from './errors';

export type LLMProviderId = 'gemini' | 'groq' | 'openrouter' | 'ollama';

export interface LLMConfig {
  provider: LLMProviderId;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface CompletionRequest {
  system: string;
  user: string;
  json: boolean;
  temperature?: number;
}

export interface ChatClient {
  complete(request: CompletionRequest): Promise<string>;
}

export const DEFAULT_MODELS: Record<LLMProviderId, string> = {
  gemini: 'gemini-2.5-flash',
  groq: 'openai/gpt-oss-120b',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  ollama: 'llama3.1',
};

function retryAfter(response: Response): number | undefined {
  const header = response.headers.get('retry-after');
  const seconds = header ? Number(header) : NaN;
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  return `${response.status} ${text.slice(0, 300)}`.trim();
}

async function postJson(
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<unknown> {
  const response = await fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  if (response.status === 429) {
    throw new RateLimitError(await readError(response), retryAfter(response));
  }
  if (!response.ok) throw new LLMRequestError(await readError(response), response.status);
  return response.json();
}

function geminiClient(config: LLMConfig, fetchFn: FetchLike): ChatClient {
  const model = config.model || DEFAULT_MODELS.gemini;
  return {
    async complete(request) {
      const data = (await postJson(
        fetchFn,
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { 'x-goog-api-key': config.apiKey ?? '' },
        {
          systemInstruction: { parts: [{ text: request.system }] },
          contents: [{ role: 'user', parts: [{ text: request.user }] }],
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            ...(request.json ? { responseMimeType: 'application/json' } : {}),
          },
        },
      )) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('');
      if (!text) throw new LLMRequestError('Gemini returned an empty response');
      return text;
    },
  };
}

function openAiCompatibleClient(
  config: LLMConfig,
  fetchFn: FetchLike,
  baseUrl: string,
  sendJsonFormat: boolean,
): ChatClient {
  const model = config.model || DEFAULT_MODELS[config.provider];
  return {
    async complete(request) {
      const data = (await postJson(
        fetchFn,
        `${baseUrl.replace(/\/$/, '')}/chat/completions`,
        config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        {
          model,
          temperature: request.temperature ?? 0.2,
          messages: [
            { role: 'system', content: request.system },
            { role: 'user', content: request.user },
          ],
          ...(request.json && sendJsonFormat ? { response_format: { type: 'json_object' } } : {}),
        },
      )) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new LLMRequestError('Provider returned an empty response');
      return text;
    },
  };
}

export function createChatClient(config: LLMConfig, fetchFn: FetchLike): ChatClient {
  switch (config.provider) {
    case 'gemini':
      return geminiClient(config, fetchFn);
    case 'groq':
      return openAiCompatibleClient(config, fetchFn, 'https://api.groq.com/openai/v1', true);
    case 'openrouter':
      return openAiCompatibleClient(config, fetchFn, 'https://openrouter.ai/api/v1', false);
    case 'ollama':
      return openAiCompatibleClient(
        config,
        fetchFn,
        `${(config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')}/v1`,
        true,
      );
  }
}
