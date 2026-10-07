import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STYLE_GUIDE,
  findBannedPhrases,
  formatStyleGuide,
  replaceDashes,
  sentencesWithBannedPhrases,
} from './style-guide';

describe('replaceDashes', () => {
  it('replaces em and en dashes inside sentences with commas', () => {
    expect(replaceDashes('Built APIs — fast and stable.')).toBe('Built APIs, fast and stable.');
    expect(replaceDashes('Next.js – React – Node')).toBe('Next.js, React, Node');
  });

  it('turns numeric ranges into hyphens and trims trailing dashes', () => {
    expect(replaceDashes('Pages 10–20 done —.')).toBe('Pages 10-20 done.');
  });
});

describe('findBannedPhrases', () => {
  it('finds phrases ignoring case and accents', () => {
    const hits = findBannedPhrases(
      'Sou APAIXONADO POR código e uma pessoa dinamica.',
      DEFAULT_STYLE_GUIDE.bannedPhrases,
    );
    expect(hits.map((hit) => hit.phrase)).toEqual(['apaixonado por', 'dinâmica']);
  });

  it('respects word boundaries', () => {
    expect(findBannedPhrases('Robustness matters', ['robusto'])).toHaveLength(0);
    expect(findBannedPhrases('Um sistema robusto.', ['robusto'])).toHaveLength(1);
  });

  it('supports split expressions with an ellipsis', () => {
    const hits = findBannedPhrases('Não apenas entreguei, mas também liderei.', [
      'não apenas... mas também',
    ]);
    expect(hits).toHaveLength(1);
    expect(hits[0]!.match.toLowerCase()).toContain('mas também');
  });

  it('returns positions that map back to the original text', () => {
    const text = 'We leverage data.';
    const [hit] = findBannedPhrases(text, ['leverage']);
    expect(text.slice(hit!.start, hit!.end)).toBe('leverage');
  });
});

describe('sentencesWithBannedPhrases', () => {
  it('returns only the problematic sentences', () => {
    const text = 'Built a checkout. We leverage synergy. Shipped on time.';
    expect(sentencesWithBannedPhrases(text, ['leverage'])).toEqual(['We leverage synergy.']);
  });
});

describe('formatStyleGuide', () => {
  it('includes rules, banned phrases and up to three samples', () => {
    const text = formatStyleGuide({
      rules: ['Short sentences.'],
      bannedPhrases: ['synergy'],
      samples: ['a', 'b', 'c', 'd'],
    });
    expect(text).toContain('Short sentences.');
    expect(text).toContain('synergy');
    expect(text).toContain('<sample 3>');
    expect(text).not.toContain('<sample 4>');
  });
});
