import { describe, expect, it } from 'vitest';
import {
  fieldKeysOf,
  finalFields,
  inventedContent,
  resumeStructureSchema,
  reviewAdaptation,
} from './template';

const original = {
  exp1_bullet1: 'Built RESTful APIs with NestJS and Prisma, reducing manual operation time by 40%.',
  exp1_bullet2: 'Developed responsive interfaces with Next.js.',
};

describe('reviewAdaptation', () => {
  it('accepts valid rewrites with the same keys', () => {
    const { fields, extraKeys, missingKeys } = reviewAdaptation(original, {
      exp1_bullet1: 'Built NestJS and Prisma REST APIs, cutting manual operation time by 40%.',
      exp1_bullet2: 'Developed responsive Next.js interfaces.',
    });
    expect(extraKeys).toEqual([]);
    expect(missingKeys).toEqual([]);
    expect(fields.every((field) => field.status === 'changed' && field.accepted)).toBe(true);
  });

  it('falls back to the original for missing keys and ignores extra keys', () => {
    const { fields, extraKeys, missingKeys } = reviewAdaptation(original, {
      exp1_bullet1: 'Built NestJS REST APIs, cutting manual work by 40%.',
      exp9_bullet1: 'Invented field',
    });
    expect(extraKeys).toEqual(['exp9_bullet1']);
    expect(missingKeys).toEqual(['exp1_bullet2']);
    const missing = fields.find((field) => field.key === 'exp1_bullet2')!;
    expect(missing.status).toBe('rejected');
    expect(missing.proposed).toBe(original.exp1_bullet2);
    expect(finalFields(original, fields).exp1_bullet2).toBe(original.exp1_bullet2);
  });

  it('rejects text more than 15% longer than the original', () => {
    const { fields } = reviewAdaptation(original, {
      ...original,
      exp1_bullet2:
        'Developed modern, accessible and responsive user interfaces with Next.js for many clients.',
    });
    const field = fields.find((item) => item.key === 'exp1_bullet2')!;
    expect(field.status).toBe('rejected');
    expect(field.reasons[0]).toContain('too long');
  });

  it('rejects invented numbers and technologies', () => {
    const { fields } = reviewAdaptation(original, {
      exp1_bullet1: 'Built APIs with NestJS and GraphQL, reducing time by 60%.',
      exp1_bullet2: original.exp1_bullet2,
    });
    const field = fields.find((item) => item.key === 'exp1_bullet1')!;
    expect(field.status).toBe('rejected');
    expect(field.reasons.join()).toContain('60%');
    expect(field.reasons.join()).toContain('GraphQL');
  });

  it('replaces dashes and flags banned phrases without rejecting', () => {
    const { fields } = reviewAdaptation(
      original,
      { ...original, exp1_bullet2: 'Developed seamless Next.js interfaces — responsive.' },
      { bannedPhrases: ['seamless'] },
    );
    const field = fields.find((item) => item.key === 'exp1_bullet2')!;
    expect(field.proposed).not.toMatch(/[—–]/);
    expect(field.bannedHits).toHaveLength(1);
  });

  it('marks identical text as unchanged and not accepted', () => {
    const { fields } = reviewAdaptation(original, { ...original });
    expect(fields.every((field) => field.status === 'unchanged' && !field.accepted)).toBe(true);
  });
});

describe('inventedContent', () => {
  it('allows terms present in the allowed context', () => {
    expect(inventedContent('Built APIs.', 'Built Docker APIs.', 'Docker')).toEqual([]);
  });
});

describe('structure', () => {
  it('lists field keys in document order', () => {
    const structure = resumeStructureSchema.parse({
      name: 'A',
      links: [],
      contact: '',
      sections: [
        {
          type: 'skills',
          title: 'Skills',
          groups: [{ label: 'Languages', field: 'skills_languages' }],
        },
        {
          type: 'experience',
          title: 'Work',
          items: [
            { heading: 'Dev', dates: '2025', stackField: 'exp1_stack', bullets: ['exp1_bullet1'] },
          ],
        },
      ],
    });
    expect(fieldKeysOf(structure)).toEqual(['skills_languages', 'exp1_stack', 'exp1_bullet1']);
  });
});
