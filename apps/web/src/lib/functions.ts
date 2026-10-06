import { supabase } from './supabase';

export async function callFunction<T = Record<string, unknown>>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) {
    const payload = data as (T & { error?: unknown }) | null;
    if (payload && typeof payload === 'object' && typeof payload.error === 'string') {
      return { data: null, error: payload.error };
    }
    return { data: payload, error: null };
  }
  const context = (error as { context?: Response }).context;
  if (context && typeof context.json === 'function') {
    const payload = (await context.json().catch(() => null)) as {
      error?: string;
      message?: string;
    } | null;
    if (payload?.error || payload?.message)
      return { data: null, error: payload.error ?? payload.message ?? null };
  }
  return { data: null, error: error.message };
}
