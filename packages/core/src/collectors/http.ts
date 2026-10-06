import type { FetchLike } from './types';

export async function getJson(
  fetchFn: FetchLike,
  url: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const response = await fetchFn(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'jobmatch-ai', ...headers },
  });
  if (!response.ok) {
    throw new Error(`GET ${url.split('?')[0]} failed with ${response.status}`);
  }
  return response.json();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
