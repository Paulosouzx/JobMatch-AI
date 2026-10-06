export const PROFILE_EXTRACT_PROMPT_VERSION = 'profile-extract.v1';

export const PROFILE_EXTRACT_SYSTEM_PROMPT = `You read a candidate CV and extract structured job-search preferences. Return ONLY a JSON object with exactly these keys:
{
  "skills": string[],
  "seniority": "intern" | "junior" | "mid" | "senior" | "lead" | null,
  "location": string | null,
  "work_modes": ("remote" | "hybrid" | "onsite")[],
  "keywords": string[],
  "headline": string
}
Rules:
- "skills": 5 to 20 concrete technical or professional skills, tools, languages and frameworks that appear in the CV, as short canonical names (for example "TypeScript", "React", "PostgreSQL"). No soft skills.
- "seniority": infer from total years of professional experience and job titles (under 1 year intern or junior, 1 to 3 junior, 3 to 6 mid, 6 or more senior, team or tech lead roles lead). Use null if unclear.
- "location": the city and country where the candidate lives, if stated, for example "Porto, Portugal". Never include street addresses or postal codes. Use null if absent.
- "work_modes": only modes the CV explicitly mentions as preferred or experienced; empty array if not stated.
- "keywords": 3 to 6 role keywords that job titles should contain for this candidate, for example "frontend", "react", "full-stack".
- "headline": one short line describing the candidate's profile, in the CV language.
Do not include markdown, code fences or text outside the JSON object. Do not invent facts.`;

export function buildProfileExtractUserPrompt(cvText: string): string {
  return ['CV:', cvText.slice(0, 12000)].join('\n');
}
