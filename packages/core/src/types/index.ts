import { z } from 'zod';

export const workModeSchema = z.enum(['remote', 'hybrid', 'onsite']);
export type WorkMode = z.infer<typeof workModeSchema>;

export const matchStatusSchema = z.enum(['new', 'seen', 'saved', 'applied', 'discarded']);
export type MatchStatus = z.infer<typeof matchStatusSchema>;

export const jobSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1),
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().nullable(),
  remote: z.boolean(),
  description: z.string(),
  url: z.string().url(),
  postedAt: z.string().datetime().nullable(),
});
export type Job = z.infer<typeof jobSchema>;

export const profileSchema = z.object({
  cvText: z.string(),
  skills: z.array(z.string()),
  seniority: z.string().nullable(),
  location: z.string().nullable(),
  workModes: z.array(workModeSchema),
  mustKeywords: z.array(z.string()),
  excludeKeywords: z.array(z.string()),
  ignoredCompanies: z.array(z.string()),
});
export type Profile = z.infer<typeof profileSchema>;

export const matchScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasons: z.array(z.string()),
  matched_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  seniority_fit: z.string(),
  location_fit: z.string(),
  summary: z.string(),
});
export type MatchScore = z.infer<typeof matchScoreSchema>;
