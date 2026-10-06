import { describe, expect, it } from 'vitest';
import { fixture, jsonResponse, mockFetch } from '../test-helpers';
import {
  adzunaCollector,
  arbeitnowCollector,
  greenhouseCollector,
  itJobsCollector,
  leverCollector,
  remoteOkCollector,
  remotiveCollector,
} from './index';

describe('collectors with mocked fetch', () => {
  it('collects from Remotive', async () => {
    const fetchFn = mockFetch({
      'https://remotive.com/api/remote-jobs': () => jsonResponse(fixture('remotive')),
    });
    const result = await remotiveCollector.collect({ category: 'software-dev' }, fetchFn);
    expect(result.errors).toEqual([]);
    expect(result.jobs).toHaveLength(3);
  });

  it('collects from Arbeitnow', async () => {
    const fetchFn = mockFetch({
      'https://www.arbeitnow.com/api/job-board-api': () => jsonResponse(fixture('arbeitnow')),
    });
    const result = await arbeitnowCollector.collect({}, fetchFn);
    expect(result.jobs).toHaveLength(3);
  });

  it('collects from RemoteOK ignoring the legal entry', async () => {
    const fetchFn = mockFetch({
      'https://remoteok.com/api': () => jsonResponse(fixture('remoteok')),
    });
    const result = await remoteOkCollector.collect({}, fetchFn);
    expect(result.jobs).toHaveLength(3);
  });

  it('isolates failing Greenhouse boards', async () => {
    const fetchFn = mockFetch({
      'https://boards-api.greenhouse.io/v1/boards/gitlab': () =>
        jsonResponse(fixture('greenhouse')),
      'https://boards-api.greenhouse.io/v1/boards/missing': () => jsonResponse({}, 404),
    });
    const result = await greenhouseCollector.collect({ companies: ['gitlab', 'missing'] }, fetchFn);
    expect(result.jobs).toHaveLength(3);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('greenhouse/missing');
  });

  it('collects from Lever', async () => {
    const fetchFn = mockFetch({
      'https://api.lever.co/v0/postings/spotify': () => jsonResponse(fixture('lever')),
    });
    const result = await leverCollector.collect({ companies: ['spotify'] }, fetchFn);
    expect(result.jobs).toHaveLength(3);
  });

  it('never leaks API keys in error messages', async () => {
    const failing = mockFetch({
      'https://api.adzuna.com': () => jsonResponse({}, 500),
      'https://api.itjobs.pt': () => jsonResponse({}, 500),
    });
    const adzuna = await adzunaCollector.collect(
      { appId: 'id', appKey: 'SECRETKEY', country: 'gb' },
      async (input, init) => {
        const response = await failing(input, init);
        return response;
      },
    );
    const itjobs = await itJobsCollector.collect({ apiKey: 'SECRETKEY' }, failing);
    expect(adzuna.errors.join()).not.toContain('SECRETKEY');
    expect(itjobs.errors.join()).not.toContain('SECRETKEY');
    expect(adzuna.errors).toHaveLength(1);
  });

  it('turns network failures into errors instead of throwing', async () => {
    const result = await remotiveCollector.collect({}, async () => {
      throw new Error('network down');
    });
    expect(result.jobs).toEqual([]);
    expect(result.errors[0]).toContain('network down');
  });
});
