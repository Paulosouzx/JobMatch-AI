import { readFileSync } from 'node:fs';
import type { FetchLike } from './collectors/types';
import type { Job, Profile } from './types';

export function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./__fixtures__/${name}.json`, import.meta.url), 'utf8'));
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export function mockFetch(routes: Record<string, () => Response>): FetchLike {
  return async (input) => {
    const key = Object.keys(routes).find((route) => input.startsWith(route));
    if (!key) throw new Error(`unexpected request: ${input}`);
    return routes[key]!();
  };
}

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    source: 'remotive',
    externalId: '1',
    title: 'Senior TypeScript Engineer',
    company: 'Acme Inc',
    location: 'Worldwide',
    remote: true,
    description: 'We use TypeScript, React and Node.js to build a SaaS product.',
    url: 'https://example.com/jobs/1',
    postedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    cvText:
      'Jane Doe\njane@example.com\n+351 912 345 678\nSenior engineer with TypeScript and React.',
    skills: ['typescript', 'react'],
    seniority: 'senior',
    location: 'Porto',
    workModes: ['remote', 'hybrid'],
    mustKeywords: [],
    excludeKeywords: [],
    ignoredCompanies: [],
    ...overrides,
  };
}
