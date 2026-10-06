import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { LLMConfig, LLMProviderId } from './core.js';

export async function loadLlmConfig(
  db: SupabaseClient,
  userId: string,
): Promise<{ config: LLMConfig; dailyLimit: number } | { error: string }> {
  const { data: settings } = await db
    .from('jm_settings')
    .select('llm_provider, llm_model, llm_base_url, daily_llm_limit')
    .eq('user_id', userId)
    .maybeSingle();
  if (!settings) return { error: 'Settings not found' };

  const provider = settings.llm_provider as LLMProviderId;
  let apiKey: string | undefined;
  if (provider !== 'ollama') {
    const { data } = await db.rpc('jm_get_user_secret', { p_user_id: userId, p_kind: 'llm' });
    apiKey = typeof data === 'string' ? data : undefined;
    if (!apiKey) return { error: 'No LLM API key saved' };
  }
  return {
    config: {
      provider,
      model: settings.llm_model ?? undefined,
      baseUrl: settings.llm_base_url ?? undefined,
      apiKey,
    },
    dailyLimit: settings.daily_llm_limit,
  };
}
