import { describe, expect, it } from 'vitest';
import { asArray, asRecord } from '../util/text';
import { fixture } from '../test-helpers';
import {
  normalizeAdzuna,
  normalizeArbeitnow,
  normalizeGreenhouse,
  normalizeItJobs,
  normalizeLever,
  normalizeRemoteOk,
  normalizeRemotive,
} from './index';

describe('normalizers with real fixtures', () => {
  it('normalizes Remotive jobs', () => {
    const items = asArray(asRecord(fixture('remotive')).jobs).map(normalizeRemotive);
    expect(items.every((item) => item !== null)).toBe(true);
    const job = items[0]!.job;
    expect(job.source).toBe('remotive');
    expect(job.remote).toBe(true);
    expect(job.description).not.toMatch(/<[a-z][^>]*>/i);
    expect(job.postedAt).toMatch(/Z$/);
  });

  it('normalizes Arbeitnow jobs with unix timestamps', () => {
    const items = asArray(asRecord(fixture('arbeitnow')).data).map(normalizeArbeitnow);
    const job = items[0]!.job;
    expect(job.source).toBe('arbeitnow');
    expect(job.remote).toBe(false);
    expect(new Date(job.postedAt!).getFullYear()).toBeGreaterThanOrEqual(2026);
  });

  it('normalizes RemoteOK jobs and skips the legal header', () => {
    const data = asArray(fixture('remoteok'));
    const items = data.filter((entry) => 'id' in asRecord(entry)).map(normalizeRemoteOk);
    expect(items).toHaveLength(3);
    expect(items[0]!.job.title.length).toBeGreaterThan(0);
    expect(normalizeRemoteOk(data[0])).toBeNull();
  });

  it('normalizes Greenhouse jobs and decodes escaped HTML', () => {
    const items = asArray(asRecord(fixture('greenhouse')).jobs).map((raw) =>
      normalizeGreenhouse(raw, 'gitlab'),
    );
    const job = items[0]!.job;
    expect(job.externalId.startsWith('gitlab:')).toBe(true);
    expect(job.description).not.toContain('&lt;');
    expect(job.description).not.toMatch(/<[a-z][^>]*>/i);
    expect(job.remote).toBe(/remote/i.test(job.location ?? ''));
  });

  it('normalizes Lever jobs', () => {
    const items = asArray(fixture('lever')).map((raw) => normalizeLever(raw, 'spotify'));
    const job = items[0]!.job;
    expect(job.company).toBe('spotify');
    expect(job.remote).toBe(false);
    expect(job.location).toBe('London');
    expect(job.url.startsWith('https://jobs.lever.co/')).toBe(true);
  });

  it('normalizes Adzuna payloads', () => {
    const result = normalizeAdzuna({
      id: '4711',
      title: 'Senior <strong>React</strong> Developer',
      description: 'Remote friendly role&hellip;',
      redirect_url: 'https://www.adzuna.com/land/ad/4711',
      created: '2026-10-01T10:00:00Z',
      company: { display_name: 'Acme' },
      location: { display_name: 'Lisbon, Portugal' },
    });
    expect(result?.job.title).toBe('Senior React Developer');
    expect(result?.job.remote).toBe(true);
  });

  it('normalizes ITJobs payloads', () => {
    const result = normalizeItJobs({
      id: 99,
      title: 'Backend Engineer',
      body: '<p>Node.js</p>',
      company: { name: 'Startup' },
      locations: [{ name: 'Porto' }],
      publishedAt: '2026-10-01 10:00:00',
    });
    expect(result?.job.location).toBe('Porto');
    expect(result?.job.url).toBe('https://www.itjobs.pt/oferta/99');
  });

  it('drops items missing required fields', () => {
    expect(normalizeRemotive({ id: 1, title: '' })).toBeNull();
    expect(normalizeLever({}, 'x')).toBeNull();
  });
});

describe('Net-Empregos RSS', () => {
  it('parses items from the real feed fixture', async () => {
    const { readFileSync } = await import('node:fs');
    const { normalizeNetEmpregos, parseNetEmpregosFeed } = await import('./index');
    const xml = readFileSync(new URL('../__fixtures__/netempregos.xml', import.meta.url), 'utf8');
    const items = parseNetEmpregosFeed(xml).map(normalizeNetEmpregos);
    expect(items).toHaveLength(3);
    const job = items[0]!.job;
    expect(job.source).toBe('netempregos');
    expect(job.externalId).toMatch(/^\d+$/);
    expect(job.url.startsWith('https://www.net-empregos.com/')).toBe(true);
    expect(job.company.length).toBeGreaterThan(0);
    expect(job.description).toMatch(/^Informática/);
    expect(job.description).not.toContain('<b>');
    expect(job.postedAt).toMatch(/Z$/);
  });
});
