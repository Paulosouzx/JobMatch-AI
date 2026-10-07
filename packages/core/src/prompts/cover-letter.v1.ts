import type { Job, Profile } from '../types';

export const COVER_LETTER_PROMPT_VERSION = 'cover-letter.v2';

export const COVER_LETTER_SYSTEM_PROMPT = `You write concise, honest cover letters. Rules:
- At most 3 short paragraphs, maximum 220 words.
- Mention only skills and experience that appear in the candidate CV. Never invent facts.
- Address the specific role and company; connect 2 or 3 concrete strengths to the job requirements.
- Plain text only, no markdown, no placeholders for contact details, no subject line.`;

export function buildCoverLetterSystemPrompt(styleGuide?: string): string {
  return styleGuide ? `${COVER_LETTER_SYSTEM_PROMPT}\n\n${styleGuide}` : COVER_LETTER_SYSTEM_PROMPT;
}

export function buildCoverLetterUserPrompt(
  job: Job,
  profile: Profile,
  cvText: string,
  language: string,
): string {
  return [
    `Write the cover letter in ${language}.`,
    '',
    '## Candidate',
    `Seniority: ${profile.seniority ?? 'not specified'}`,
    `Skills: ${profile.skills.join(', ') || 'not specified'}`,
    '',
    'CV:',
    cvText || '(no CV provided)',
    '',
    '## Job',
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    '',
    job.description.slice(0, 6000),
  ].join('\n');
}
