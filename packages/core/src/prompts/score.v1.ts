import type { Job, Profile } from '../types';

export const SCORE_PROMPT_VERSION = 'score.v1';

export const SCORE_SYSTEM_PROMPT = `You are a precise recruiting analyst. You compare one job posting with one candidate profile and return a strict JSON object.

Scoring guide (score is an integer from 0 to 100):
- 90-100: near-perfect fit on skills, seniority and location
- 70-89: strong fit with minor gaps
- 50-69: partial fit, notable gaps
- 0-49: poor fit

Return ONLY a JSON object with exactly these keys:
{
  "score": number,
  "reasons": string[],
  "matched_skills": string[],
  "missing_skills": string[],
  "seniority_fit": string,
  "location_fit": string,
  "summary": string
}
"reasons" must contain 2 to 4 short reasons. "seniority_fit" is one of "good", "stretch", "overqualified", "unknown". "location_fit" is one of "good", "partial", "poor", "unknown". "summary" is one sentence.
Do not include markdown, code fences or any text outside the JSON object. Base the analysis only on the provided data.`;

export function buildScoreUserPrompt(
  job: Job,
  profile: Profile,
  cvText: string,
  language: string,
): string {
  return [
    `Write "reasons" and "summary" in ${language}. Keep skill names as written in the job posting.`,
    '',
    '## Candidate profile',
    `Seniority: ${profile.seniority ?? 'not specified'}`,
    `Location: ${profile.location ?? 'not specified'}`,
    `Work mode preference: ${profile.workModes.join(', ') || 'not specified'}`,
    `Declared skills: ${profile.skills.join(', ') || 'not specified'}`,
    '',
    'CV:',
    cvText || '(no CV provided)',
    '',
    '## Job posting',
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location ?? 'not specified'}`,
    `Remote: ${job.remote ? 'yes' : 'no'}`,
    '',
    'Description:',
    job.description.slice(0, 6000),
  ].join('\n');
}

export function buildRepairPrompt(previousOutput: string, problem: string): string {
  return [
    'Your previous answer was not valid for the required schema.',
    `Problem: ${problem}`,
    '',
    'Previous answer:',
    previousOutput.slice(0, 4000),
    '',
    'Return ONLY the corrected JSON object with the exact required keys and no extra text.',
  ].join('\n');
}
