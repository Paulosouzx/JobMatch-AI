export type MatchStatus = 'new' | 'seen' | 'saved' | 'applied' | 'discarded';

export type EvaluationState = 'scored' | 'pending' | 'filtered' | 'error';

export interface MatchSummary {
  id: string;
  score: number | null;
  status: MatchStatus;
  error: string | null;
  analysis: {
    reasons?: string[];
    matched_skills?: string[];
    missing_skills?: string[];
    seniority_fit?: string;
    location_fit?: string;
    summary?: string;
    language?: string;
    work_mode?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
    salary?: string | null;
    requirements_required?: string[];
    requirements_nice?: string[];
    benefits?: string[];
  } | null;
  created_at?: string;
}

export interface JobRow {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  source: string;
  url: string;
  posted_at: string | null;
  created_at: string;
  rule_status: 'pending' | 'passed' | 'rejected';
  reject_reason: string | null;
  description?: string;
  jm_job_matches: MatchSummary | MatchSummary[] | null;
}

export function matchOf(row: Pick<JobRow, 'jm_job_matches'>): MatchSummary | null {
  const value = row.jm_job_matches;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function evaluationOf(row: Pick<JobRow, 'jm_job_matches' | 'rule_status'>): EvaluationState {
  const match = matchOf(row);
  if (row.rule_status === 'rejected') return 'filtered';
  if (match?.error) return 'error';
  if (match?.score !== null && match?.score !== undefined) return 'scored';
  return 'pending';
}
