import type { Job } from '../types';

function cyrb53(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

function normalizeForHash(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\((m|f|d|w|x|\/|\s)+\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const COMPANY_SUFFIXES = /\b(inc|llc|ltd|gmbh|sa|sl|lda|corp|co|ag|plc)\b/g;

export function dedupeHash(title: string, company: string): string {
  const normalizedCompany = normalizeForHash(company).replace(COMPANY_SUFFIXES, '').trim();
  return cyrb53(`${normalizeForHash(title)}|${normalizedCompany}`);
}

export interface DedupeResult {
  fresh: Job[];
  duplicates: Job[];
}

export function dedupeJobs(
  jobs: Job[],
  known: { externalKeys?: Iterable<string>; hashes?: Iterable<string> } = {},
): DedupeResult {
  const seenKeys = new Set(known.externalKeys ?? []);
  const seenHashes = new Set(known.hashes ?? []);
  const fresh: Job[] = [];
  const duplicates: Job[] = [];
  for (const job of jobs) {
    const key = externalKey(job);
    const hash = dedupeHash(job.title, job.company);
    if (seenKeys.has(key) || seenHashes.has(hash)) {
      duplicates.push(job);
      continue;
    }
    seenKeys.add(key);
    seenHashes.add(hash);
    fresh.push(job);
  }
  return { fresh, duplicates };
}

export function externalKey(job: Pick<Job, 'source' | 'externalId'>): string {
  return `${job.source}:${job.externalId}`;
}
