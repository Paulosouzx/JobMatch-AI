import type { Job, Profile } from '../types';

export type SeniorityLevel = 0 | 1 | 2 | 3 | 4;

const LEVEL_PATTERNS: [SeniorityLevel, RegExp][] = [
  [4, /\b(lead|principal|staff|head of|director|architect|vp)\b/i],
  [3, /\b(senior|sr\.?|s[eé]nior)\b/i],
  [0, /\b(intern|internship|trainee|est[aá]gio|estagi[aá]rio|apprentice|werkstudent)\b/i],
  [1, /\b(junior|jr\.?|entry[- ]level|graduate)\b/i],
];

export function inferSeniority(text: string): SeniorityLevel | null {
  for (const [level, pattern] of LEVEL_PATTERNS) {
    if (pattern.test(text)) return level;
  }
  if (/\b(mid|pleno|intermediate|mid[- ]level)\b/i.test(text)) return 2;
  return null;
}

export interface RuleResult {
  passed: boolean;
  reason: string | null;
}

const pass: RuleResult = { passed: true, reason: null };
const reject = (reason: string): RuleResult => ({ passed: false, reason });

function includesTerm(haystack: string, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (needle === '') return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const boundary = /^[a-z0-9]/.test(needle) && /[a-z0-9]$/.test(needle);
  const pattern = boundary
    ? new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`)
    : new RegExp(escaped);
  return pattern.test(haystack);
}

export function applyRules(job: Job, profile: Profile): RuleResult {
  const company = job.company.trim().toLowerCase();
  if (profile.ignoredCompanies.some((ignored) => ignored.trim().toLowerCase() === company)) {
    return reject('ignored_company');
  }

  const haystack = `${job.title}\n${job.description}`.toLowerCase();

  for (const keyword of profile.excludeKeywords) {
    if (includesTerm(haystack, keyword)) return reject(`excluded_keyword:${keyword}`);
  }

  const must = profile.mustKeywords.filter((keyword) => keyword.trim() !== '');
  if (must.length > 0 && !must.some((keyword) => includesTerm(haystack, keyword))) {
    return reject('missing_required_keyword');
  }

  if (profile.workModes.length > 0) {
    const wantsRemote = profile.workModes.includes('remote');
    const wantsOnsite =
      profile.workModes.includes('hybrid') || profile.workModes.includes('onsite');
    if (job.remote && !wantsRemote) return reject('work_mode');
    if (!job.remote && !wantsOnsite) return reject('work_mode');
    if (!job.remote && wantsOnsite && profile.location && job.location) {
      const city = profile.location.split(',')[0]?.trim().toLowerCase() ?? '';
      if (city !== '' && !job.location.toLowerCase().includes(city)) {
        return reject('location');
      }
    }
  }

  if (profile.seniority) {
    const wanted = inferSeniority(profile.seniority);
    const offered = inferSeniority(job.title);
    if (wanted !== null && offered !== null && Math.abs(wanted - offered) >= 2) {
      return reject('seniority');
    }
  }

  return pass;
}

export function partitionByRules(
  jobs: Job[],
  profile: Profile,
): { passed: Job[]; rejected: { job: Job; reason: string }[] } {
  const passed: Job[] = [];
  const rejected: { job: Job; reason: string }[] = [];
  for (const job of jobs) {
    const result = applyRules(job, profile);
    if (result.passed) passed.push(job);
    else rejected.push({ job, reason: result.reason ?? 'rejected' });
  }
  return { passed, rejected };
}
