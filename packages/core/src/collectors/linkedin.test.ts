import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { linkedInCollector, parseLinkedInDetail, parseLinkedInSearch } from './linkedin';

const searchHtml = readFileSync(
  new URL('../__fixtures__/linkedin-search.html', import.meta.url),
  'utf8',
);
const detailHtml = readFileSync(
  new URL('../__fixtures__/linkedin-detail.html', import.meta.url),
  'utf8',
);
const noSleep = async () => undefined;

describe('LinkedIn parsing with real fixtures', () => {
  it('parses search cards', () => {
    const cards = parseLinkedInSearch(searchHtml);
    expect(cards).toHaveLength(3);
    const card = cards[0]!;
    expect(card.id).toMatch(/^\d+$/);
    expect(card.title.length).toBeGreaterThan(3);
    expect(card.company.length).toBeGreaterThan(1);
    expect(card.url).toMatch(/^https:\/\/[a-z]+\.linkedin\.com\/jobs\/view\/[^?]+$/);
    expect(card.title).not.toContain('&amp;');
  });

  it('parses the job description and criteria', () => {
    const detail = parseLinkedInDetail(detailHtml);
    expect(detail.description.length).toBeGreaterThan(100);
    expect(detail.description).not.toMatch(/<[a-z]/i);
    expect(detail.criteria.length).toBeGreaterThan(0);
  });
});

describe('linkedInCollector', () => {
  it('collects cards and enriches them with descriptions', async () => {
    const urls: string[] = [];
    const fetchFn = async (url: string) => {
      urls.push(url);
      return new Response(url.includes('/jobPosting/') ? detailHtml : searchHtml, { status: 200 });
    };
    const result = await linkedInCollector.collect(
      { searches: ['full stack'], location: 'Portugal', sleep: noSleep, maxDetails: 2 },
      fetchFn,
    );
    expect(result.errors).toEqual([]);
    expect(result.jobs).toHaveLength(3);
    expect(result.jobs[0]!.job.source).toBe('linkedin');
    expect(result.jobs[0]!.job.description.length).toBeGreaterThan(100);
    expect(urls.filter((url) => url.includes('/jobPosting/'))).toHaveLength(2);
    expect(urls[0]).toContain('keywords=full+stack');
    expect(urls[0]).toContain('sortBy=DD');
  });

  it('stops quietly and keeps what it has when LinkedIn blocks', async () => {
    let calls = 0;
    const fetchFn = async (url: string) => {
      calls++;
      if (url.includes('/jobPosting/')) return new Response('', { status: 429 });
      return new Response(searchHtml, { status: 200 });
    };
    const result = await linkedInCollector.collect(
      { searches: ['react', 'node'], sleep: noSleep },
      fetchFn,
    );
    expect(result.jobs).toHaveLength(3);
    expect(result.errors.join()).toContain('blocked by LinkedIn');
    expect(calls).toBeLessThan(10);
  });

  it('caps the number of searches to three', async () => {
    const urls: string[] = [];
    const fetchFn = async (url: string) => {
      urls.push(url);
      return new Response('', { status: 200 });
    };
    await linkedInCollector.collect(
      { searches: ['a', 'b', 'c', 'd', 'e'], sleep: noSleep },
      fetchFn,
    );
    expect(urls.length).toBe(3);
  });
});
