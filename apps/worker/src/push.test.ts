import { describe, expect, it } from 'vitest';
import { formatMatchNotification, formatSummaryNotification } from './push';

const analysis = {
  score: 91,
  reasons: ['Stack TypeScript', 'Remoto', 'Ignorado'],
  matched_skills: [],
  missing_skills: [],
  seniority_fit: 'good',
  location_fit: 'good',
  summary: 'ok',
};

describe('formatMatchNotification', () => {
  it('puts score and title in the title, company and two reasons in the body', () => {
    const payload = formatMatchNotification(
      'abc',
      { title: 'Senior Dev', company: 'Acme', location: 'Porto' },
      analysis,
    );
    expect(payload.title).toBe('91 · Senior Dev');
    expect(payload.body).toBe('Acme · Porto\nStack TypeScript · Remoto');
    expect(payload.url).toBe('/app/jobs/abc');
    expect(payload.tag).toBe('jobmatch-abc');
  });

  it('truncates long titles', () => {
    const payload = formatMatchNotification(
      'x',
      { title: 'A'.repeat(200), company: 'Acme', location: null },
      analysis,
    );
    expect(payload.title.length).toBe(80);
    expect(payload.title.endsWith('…')).toBe(true);
  });
});

describe('formatSummaryNotification', () => {
  it('pluralizes', () => {
    expect(formatSummaryNotification(1).body).toContain('1 vaga relevante');
    expect(formatSummaryNotification(4).body).toContain('4 vagas relevantes');
  });
});
