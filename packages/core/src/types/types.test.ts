import { describe, expect, it } from 'vitest';
import { matchScoreSchema } from './index';

describe('matchScoreSchema', () => {
  const valid = {
    score: 82,
    reasons: ['Strong TypeScript match'],
    matched_skills: ['typescript'],
    missing_skills: ['go'],
    seniority_fit: 'good',
    location_fit: 'good',
    summary: 'Solid fit',
  };

  it('accepts a valid score payload', () => {
    expect(matchScoreSchema.parse(valid).score).toBe(82);
  });

  it('rejects out-of-range scores', () => {
    expect(matchScoreSchema.safeParse({ ...valid, score: 101 }).success).toBe(false);
  });
});
