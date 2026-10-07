import { z } from 'zod';
import { findBannedPhrases, replaceDashes, type BannedHit } from '../style/style-guide';

export const resumeFieldKey = z.string().regex(/^[a-z0-9_]+$/);

const educationItem = z.object({
  school: z.string(),
  degree: z.string(),
  location: z.string(),
  dates: z.string(),
});

const skillGroup = z.object({ label: z.string(), field: resumeFieldKey });

const experienceItem = z.object({
  heading: z.string(),
  dates: z.string(),
  subtitle: z.string().optional(),
  stackLabel: z.string().optional(),
  stackField: resumeFieldKey.optional(),
  bullets: z.array(resumeFieldKey),
});

export const resumeSectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('summary'), title: z.string(), field: resumeFieldKey }),
  z.object({ type: z.literal('education'), title: z.string(), items: z.array(educationItem) }),
  z.object({ type: z.literal('skills'), title: z.string(), groups: z.array(skillGroup) }),
  z.object({ type: z.literal('experience'), title: z.string(), items: z.array(experienceItem) }),
  z.object({ type: z.literal('list'), title: z.string(), items: z.array(z.string()) }),
]);

export const resumeStructureSchema = z.object({
  name: z.string(),
  links: z.array(z.string()),
  contact: z.string(),
  sections: z.array(resumeSectionSchema),
});

export type ResumeStructure = z.infer<typeof resumeStructureSchema>;
export type ResumeSection = z.infer<typeof resumeSectionSchema>;
export type ResumeFields = Record<string, string>;

export function fieldKeysOf(structure: ResumeStructure): string[] {
  const keys: string[] = [];
  for (const section of structure.sections) {
    if (section.type === 'summary') keys.push(section.field);
    if (section.type === 'skills') keys.push(...section.groups.map((group) => group.field));
    if (section.type === 'experience') {
      for (const item of section.items) {
        if (item.stackField) keys.push(item.stackField);
        keys.push(...item.bullets);
      }
    }
  }
  return keys;
}

export interface FieldReview {
  key: string;
  original: string;
  proposed: string;
  accepted: boolean;
  status: 'changed' | 'unchanged' | 'rejected';
  reasons: string[];
  bannedHits: BannedHit[];
}

const TECH_TOKEN = /[A-Za-z][A-Za-z0-9]*(?:[.#+/-][A-Za-z0-9#+]+)*/g;
const COMMON_CAPITALIZED = new Set([
  'I',
  'A',
  'An',
  'The',
  'And',
  'For',
  'With',
  'In',
  'On',
  'At',
  'To',
  'Of',
  'By',
  'From',
  'As',
  'Via',
  'O',
  'E',
  'Em',
  'De',
  'Do',
  'Da',
  'Para',
  'Com',
  'Por',
  'Na',
  'No',
  'Os',
  'As',
  'Um',
  'Uma',
]);

function numbersIn(text: string): string[] {
  return [...text.matchAll(/\d+(?:[.,]\d+)?%?/g)].map((match) => match[0].replace(',', '.'));
}

function techTermsIn(text: string): string[] {
  return [...text.matchAll(TECH_TOKEN)]
    .map((match) => match[0])
    .filter((token, index, all) => {
      if (COMMON_CAPITALIZED.has(token)) return false;
      const startsSentence = index === 0;
      const looksTechnical =
        /[A-Z].*[A-Z]|[.#+]|\d/.test(token) || (/^[A-Z]/.test(token) && !startsSentence);
      return looksTechnical && all.indexOf(token) === index;
    });
}

export function inventedContent(original: string, proposed: string, allowedContext = ''): string[] {
  const reasons: string[] = [];
  const originalNumbers = new Set(numbersIn(original));
  const newNumbers = numbersIn(proposed).filter((value) => !originalNumbers.has(value));
  if (newNumbers.length > 0) reasons.push(`new numbers: ${[...new Set(newNumbers)].join(', ')}`);
  const known = `${original} ${allowedContext}`.toLowerCase();
  const newTerms = techTermsIn(proposed).filter((term) => !known.includes(term.toLowerCase()));
  if (newTerms.length > 0) reasons.push(`new terms: ${newTerms.slice(0, 5).join(', ')}`);
  return reasons;
}

export interface ReviewOptions {
  maxGrowth?: number;
  bannedPhrases?: string[];
  allowedContext?: string;
}

export function reviewAdaptation(
  original: ResumeFields,
  proposedRaw: unknown,
  options: ReviewOptions = {},
): { fields: FieldReview[]; extraKeys: string[]; missingKeys: string[] } {
  const maxGrowth = options.maxGrowth ?? 0.15;
  const banned = options.bannedPhrases ?? [];
  const proposed =
    proposedRaw && typeof proposedRaw === 'object' && !Array.isArray(proposedRaw)
      ? (proposedRaw as Record<string, unknown>)
      : {};
  const extraKeys = Object.keys(proposed).filter((key) => !(key in original));
  const missingKeys = Object.keys(original).filter((key) => typeof proposed[key] !== 'string');

  const fields = Object.entries(original).map(([key, originalText]): FieldReview => {
    const raw = proposed[key];
    if (typeof raw !== 'string' || raw.trim() === '') {
      return {
        key,
        original: originalText,
        proposed: originalText,
        accepted: false,
        status: 'rejected',
        reasons: ['missing key'],
        bannedHits: [],
      };
    }
    const cleaned = replaceDashes(raw.trim());
    const reasons: string[] = [];
    const limit = Math.ceil(originalText.length * (1 + maxGrowth));
    if (cleaned.length > limit) reasons.push(`too long (${cleaned.length}/${limit} chars)`);
    reasons.push(...inventedContent(originalText, cleaned, options.allowedContext));
    if (reasons.length > 0) {
      return {
        key,
        original: originalText,
        proposed: cleaned,
        accepted: false,
        status: 'rejected',
        reasons,
        bannedHits: findBannedPhrases(cleaned, banned),
      };
    }
    const unchanged = cleaned === originalText.trim();
    return {
      key,
      original: originalText,
      proposed: cleaned,
      accepted: !unchanged,
      status: unchanged ? 'unchanged' : 'changed',
      reasons: [],
      bannedHits: findBannedPhrases(cleaned, banned),
    };
  });
  return { fields, extraKeys, missingKeys };
}

export function finalFields(base: ResumeFields, reviews: FieldReview[]): ResumeFields {
  const result: ResumeFields = { ...base };
  for (const review of reviews) {
    if (review.accepted && review.status !== 'rejected') result[review.key] = review.proposed;
  }
  return result;
}
