import { describe, expect, it } from 'vitest';
import { makeJob } from '../test-helpers';
import { dedupeHash, dedupeJobs, externalKey } from './index';

describe('dedupeHash', () => {
  it('matches the same role across casing, accents, gender markers and company suffixes', () => {
    const a = dedupeHash('Senior Développeur (m/f/d)', 'Acme GmbH');
    const b = dedupeHash('senior developpeur', 'ACME');
    expect(a).toBe(b);
  });

  it('differs for different roles or companies', () => {
    expect(dedupeHash('Backend Engineer', 'Acme')).not.toBe(
      dedupeHash('Frontend Engineer', 'Acme'),
    );
    expect(dedupeHash('Backend Engineer', 'Acme')).not.toBe(
      dedupeHash('Backend Engineer', 'Globex'),
    );
  });
});

describe('dedupeJobs', () => {
  it('removes duplicates inside a batch by external key and by hash across sources', () => {
    const jobs = [
      makeJob({ source: 'remotive', externalId: '1' }),
      makeJob({ source: 'remotive', externalId: '1' }),
      makeJob({ source: 'remoteok', externalId: '9' }),
      makeJob({ source: 'lever', externalId: 'x', title: 'Data Engineer', company: 'Other' }),
    ];
    const { fresh, duplicates } = dedupeJobs(jobs);
    expect(fresh.map(externalKey)).toEqual(['remotive:1', 'lever:x']);
    expect(duplicates).toHaveLength(2);
  });

  it('respects keys and hashes already stored', () => {
    const job = makeJob();
    const known = dedupeJobs([job], { externalKeys: [externalKey(job)] });
    expect(known.fresh).toEqual([]);
    const byHash = dedupeJobs([makeJob({ source: 'lever', externalId: 'z' })], {
      hashes: [dedupeHash(job.title, job.company)],
    });
    expect(byHash.fresh).toEqual([]);
  });
});
