export const FIX_TEXT_PROMPT_VERSION = 'fix-text.v1';

export function buildFixTextSystemPrompt(styleGuide: string): string {
  return `You rewrite individual sentences so they follow a style guide. Return ONLY a JSON object {"sentences": string[]} with exactly one rewritten sentence per input sentence, in the same order and the same language. Keep the meaning and every fact; do not add new facts, numbers or technologies.

${styleGuide}`;
}

export function buildFixTextUserPrompt(sentences: string[], banned: string[]): string {
  return [
    `Remove these words or expressions: ${banned.join('; ')}.`,
    '',
    JSON.stringify({ sentences }, null, 2),
  ].join('\n');
}
