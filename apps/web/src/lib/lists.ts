export function parseList(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of text.split(/[\n,]/)) {
    const value = part.trim();
    const key = value.toLowerCase();
    if (value === '' || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

export function formatList(values: string[], separator = ', '): string {
  return values.join(separator);
}
