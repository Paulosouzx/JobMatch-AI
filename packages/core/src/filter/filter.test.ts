import { describe, expect, it } from 'vitest';
import { makeJob, makeProfile } from '../test-helpers';
import { applyRules, inferSeniority, partitionByRules } from './index';

describe('inferSeniority', () => {
  it('detects levels from titles', () => {
    expect(inferSeniority('Junior Developer')).toBe(1);
    expect(inferSeniority('Estágio em Engenharia')).toBe(0);
    expect(inferSeniority('Senior Engineer')).toBe(3);
    expect(inferSeniority('Staff Engineer')).toBe(4);
    expect(inferSeniority('Desenvolvedor Pleno')).toBe(2);
    expect(inferSeniority('Software Engineer')).toBeNull();
  });
});

describe('applyRules', () => {
  it('passes a matching job', () => {
    expect(applyRules(makeJob(), makeProfile())).toEqual({ passed: true, reason: null });
  });

  it('rejects ignored companies case-insensitively', () => {
    const result = applyRules(makeJob(), makeProfile({ ignoredCompanies: ['ACME INC'] }));
    expect(result.reason).toBe('ignored_company');
  });

  it('rejects excluded keywords on word boundaries only', () => {
    const profile = makeProfile({ excludeKeywords: ['java'] });
    expect(applyRules(makeJob({ description: 'Strong Java skills' }), profile).reason).toBe(
      'excluded_keyword:java',
    );
    expect(applyRules(makeJob({ description: 'We love JavaScript' }), profile).passed).toBe(true);
  });

  it('requires at least one mandatory keyword', () => {
    const profile = makeProfile({ mustKeywords: ['react', 'vue'] });
    expect(applyRules(makeJob(), profile).passed).toBe(true);
    expect(applyRules(makeJob({ description: 'Python only' }), profile).reason).toBe(
      'missing_required_keyword',
    );
  });

  it('applies work mode and location rules', () => {
    const onsiteOnly = makeProfile({ workModes: ['onsite'], location: 'Porto' });
    expect(applyRules(makeJob({ remote: true }), onsiteOnly).reason).toBe('work_mode');
    expect(applyRules(makeJob({ remote: false, location: 'Berlin' }), onsiteOnly).reason).toBe(
      'location',
    );
    expect(
      applyRules(makeJob({ remote: false, location: 'Porto, Portugal' }), onsiteOnly).passed,
    ).toBe(true);
    const remoteOnly = makeProfile({ workModes: ['remote'] });
    expect(applyRules(makeJob({ remote: false, location: 'Porto' }), remoteOnly).reason).toBe(
      'work_mode',
    );
  });

  it('rejects seniority gaps of two levels or more', () => {
    const profile = makeProfile({ seniority: 'senior' });
    expect(applyRules(makeJob({ title: 'Junior Developer' }), profile).reason).toBe('seniority');
    expect(applyRules(makeJob({ title: 'Software Engineer' }), profile).passed).toBe(true);
    expect(applyRules(makeJob({ title: 'Lead Engineer' }), profile).passed).toBe(true);
  });
});

describe('partitionByRules', () => {
  it('splits passed and rejected jobs', () => {
    const jobs = [makeJob(), makeJob({ externalId: '2', company: 'Skip' })];
    const { passed, rejected } = partitionByRules(
      jobs,
      makeProfile({ ignoredCompanies: ['skip'] }),
    );
    expect(passed).toHaveLength(1);
    expect(rejected[0]?.reason).toBe('ignored_company');
  });
});
