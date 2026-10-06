import type { LLMConfig } from './core.js';

export async function listModels(config: LLMConfig): Promise<string[]> {
  if (config.provider === 'gemini') {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
      {
        headers: { 'x-goog-api-key': config.apiKey ?? '' },
      },
    );
    if (!response.ok)
      throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
    const data = (await response.json()) as {
      models?: { name: string; supportedGenerationMethods?: string[] }[];
    };
    return (data.models ?? [])
      .filter((model) => model.supportedGenerationMethods?.includes('generateContent'))
      .map((model) => model.name.replace(/^models\//, ''))
      .sort();
  }
  const base =
    config.provider === 'groq'
      ? 'https://api.groq.com/openai/v1'
      : config.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1'
        : `${(config.baseUrl || 'http://localhost:11434').replace(/\/+$/, '')}/v1`;
  const response = await fetch(`${base}/models`, {
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
  });
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as { data?: { id: string }[] };
  return (data.data ?? [])
    .map((model) => model.id)
    .filter((id) => !/whisper|tts|guard|embed|playai|orpheus/i.test(id))
    .sort();
}
