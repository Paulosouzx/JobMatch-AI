import type { Profile } from '@jobmatch/core';

export interface UserSettings {
  user_id: string;
  llm_provider: 'gemini' | 'groq' | 'openrouter' | 'ollama';
  llm_model: string | null;
  llm_base_url: string | null;
  adzuna_app_id: string | null;
  min_score: number;
  daily_llm_limit: number;
  frequency_hours: number;
  llm_concurrency: number;
}

export interface SourceRow {
  type: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface RunStats {
  collected: number;
  newJobs: number;
  filteredOut: number;
  scored: number;
  notified: number;
  llmCalls: number;
  errors: string[];
}

export function emptyStats(): RunStats {
  return {
    collected: 0,
    newJobs: 0,
    filteredOut: 0,
    scored: 0,
    notified: 0,
    llmCalls: 0,
    errors: [],
  };
}

export interface ProfileRow {
  cv_text: string;
  skills: string[];
  seniority: string | null;
  location: string | null;
  work_modes: string[];
  must_keywords: string[];
  exclude_keywords: string[];
  ignored_companies: string[];
}

export function toProfile(row: ProfileRow): Profile {
  return {
    cvText: row.cv_text,
    skills: row.skills,
    seniority: row.seniority,
    location: row.location,
    workModes: row.work_modes as Profile['workModes'],
    mustKeywords: row.must_keywords,
    excludeKeywords: row.exclude_keywords,
    ignoredCompanies: row.ignored_companies,
  };
}
