export const RESUME_ADAPT_PROMPT_VERSION = 'resume-adapt.v1';

export function buildResumeAdaptSystemPrompt(styleGuide: string): string {
  return `You tailor CV text to a specific job posting. You receive a JSON object of CV fields and a job summary.

Hard rules:
- Return ONLY a JSON object with EXACTLY the same keys you received. No new keys, no removed keys, no nested objects.
- Every value is a rewrite of the original value for that same key.
- Use ONLY facts already present in that original value: do not add technologies, tools, numbers, results, employers, responsibilities or claims that are not in it.
- You may reorder, shorten, rephrase and emphasise what matches the job. Keep each value at most 15% longer than its original.
- Keep the same language as the original value.
- If a value cannot be improved without inventing anything, return it unchanged.

${styleGuide}

Do not include markdown, code fences or any text outside the JSON object.`;
}

export function buildResumeAdaptUserPrompt(
  jobSummary: string,
  fields: Record<string, string>,
): string {
  return ['## Job', jobSummary, '', '## CV fields (JSON)', JSON.stringify(fields, null, 2)].join(
    '\n',
  );
}
