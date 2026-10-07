import { asArray, asRecord } from '../util/text';
import {
  normalizeAdzuna,
  normalizeArbeitnow,
  normalizeGreenhouse,
  normalizeItJobs,
  normalizeLever,
  normalizeNetEmpregos,
  parseNetEmpregosFeed,
  normalizeRemoteOk,
  normalizeRemotive,
  type CollectedJob,
} from '../normalize';
import { errorMessage, getJson } from './http';
import type { CollectResult, Collector } from './types';

export type { CollectResult, Collector, FetchLike } from './types';

function compact(items: (CollectedJob | null)[]): CollectedJob[] {
  return items.filter((item): item is CollectedJob => item !== null);
}

export interface RemotiveConfig {
  category?: string;
  search?: string;
  limit?: number;
}

export const remotiveCollector: Collector<RemotiveConfig> = {
  id: 'remotive',
  async collect(config, fetchFn) {
    const params = new URLSearchParams({ limit: String(config.limit ?? 100) });
    if (config.category) params.set('category', config.category);
    if (config.search) params.set('search', config.search);
    try {
      const data = asRecord(
        await getJson(fetchFn, `https://remotive.com/api/remote-jobs?${params}`),
      );
      return { jobs: compact(asArray(data.jobs).map(normalizeRemotive)), errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`remotive: ${errorMessage(error)}`] };
    }
  },
};

export const arbeitnowCollector: Collector<Record<string, never>> = {
  id: 'arbeitnow',
  async collect(_config, fetchFn) {
    try {
      const data = asRecord(await getJson(fetchFn, 'https://www.arbeitnow.com/api/job-board-api'));
      return { jobs: compact(asArray(data.data).map(normalizeArbeitnow)), errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`arbeitnow: ${errorMessage(error)}`] };
    }
  },
};

export const remoteOkCollector: Collector<Record<string, never>> = {
  id: 'remoteok',
  async collect(_config, fetchFn) {
    try {
      const data = asArray(await getJson(fetchFn, 'https://remoteok.com/api'));
      const items = data.filter((entry) => 'id' in asRecord(entry));
      return { jobs: compact(items.map(normalizeRemoteOk)), errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`remoteok: ${errorMessage(error)}`] };
    }
  },
};

export interface CompanyBoardConfig {
  companies: string[];
}

async function collectBoards(
  config: CompanyBoardConfig,
  fetchFn: Parameters<Collector<CompanyBoardConfig>['collect']>[1],
  id: string,
  urlFor: (company: string) => string,
  extract: (data: unknown) => unknown[],
  normalize: (raw: unknown, company: string) => CollectedJob | null,
): Promise<CollectResult> {
  const result: CollectResult = { jobs: [], errors: [] };
  for (const company of config.companies) {
    try {
      const data = await getJson(fetchFn, urlFor(company));
      result.jobs.push(...compact(extract(data).map((raw) => normalize(raw, company))));
    } catch (error) {
      result.errors.push(`${id}/${company}: ${errorMessage(error)}`);
    }
  }
  return result;
}

export const greenhouseCollector: Collector<CompanyBoardConfig> = {
  id: 'greenhouse',
  collect: (config, fetchFn) =>
    collectBoards(
      config,
      fetchFn,
      'greenhouse',
      (company) =>
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company)}/jobs?content=true`,
      (data) => asArray(asRecord(data).jobs),
      normalizeGreenhouse,
    ),
};

export const leverCollector: Collector<CompanyBoardConfig> = {
  id: 'lever',
  collect: (config, fetchFn) =>
    collectBoards(
      config,
      fetchFn,
      'lever',
      (company) => `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`,
      (data) => asArray(data),
      normalizeLever,
    ),
};

export interface AdzunaConfig {
  appId: string;
  appKey: string;
  country: string;
  what?: string;
  where?: string;
  resultsPerPage?: number;
}

export const adzunaCollector: Collector<AdzunaConfig> = {
  id: 'adzuna',
  async collect(config, fetchFn) {
    const params = new URLSearchParams({
      app_id: config.appId,
      app_key: config.appKey,
      results_per_page: String(config.resultsPerPage ?? 50),
      sort_by: 'date',
    });
    if (config.what) params.set('what', config.what);
    if (config.where) params.set('where', config.where);
    try {
      const data = asRecord(
        await getJson(
          fetchFn,
          `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(config.country)}/search/1?${params}`,
        ),
      );
      return { jobs: compact(asArray(data.results).map(normalizeAdzuna)), errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`adzuna: ${errorMessage(error).replace(config.appKey, '***')}`] };
    }
  },
};

export interface ItJobsConfig {
  apiKey: string;
  query?: string;
  limit?: number;
}

export const itJobsCollector: Collector<ItJobsConfig> = {
  id: 'itjobs',
  async collect(config, fetchFn) {
    const params = new URLSearchParams({
      api_key: config.apiKey,
      limit: String(config.limit ?? 50),
    });
    if (config.query) params.set('q', config.query);
    try {
      const data = asRecord(
        await getJson(fetchFn, `https://api.itjobs.pt/job/list.json?${params}`),
      );
      return { jobs: compact(asArray(data.results).map(normalizeItJobs)), errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`itjobs: ${errorMessage(error).replace(config.apiKey, '***')}`] };
    }
  },
};

export interface NetEmpregosConfig {
  categories?: string[];
}

export const netEmpregosCollector: Collector<NetEmpregosConfig> = {
  id: 'netempregos',
  async collect(config, fetchFn) {
    try {
      const response = await fetchFn('https://www.net-empregos.com/rss.asp', {
        headers: { Accept: 'application/rss+xml, application/xml', 'User-Agent': 'jobmatch-ai' },
      });
      if (!response.ok) throw new Error(`GET net-empregos rss failed with ${response.status}`);
      const xml = new TextDecoder('iso-8859-1').decode(await response.arrayBuffer());
      const wanted = (config.categories ?? [])
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const jobs = compact(parseNetEmpregosFeed(xml).map(normalizeNetEmpregos)).filter((item) => {
        if (wanted.length === 0) return true;
        const category = String((item.raw as { category?: string }).category ?? '').toLowerCase();
        return wanted.some((value) => category.includes(value));
      });
      return { jobs, errors: [] };
    } catch (error) {
      return { jobs: [], errors: [`netempregos: ${errorMessage(error)}`] };
    }
  },
};

export {
  linkedInCollector,
  normalizeLinkedIn,
  parseLinkedInDetail,
  parseLinkedInSearch,
} from './linkedin';
export type { LinkedInConfig } from './linkedin';
