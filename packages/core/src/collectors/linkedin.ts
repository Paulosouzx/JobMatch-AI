import { jobSchema } from '../types';
import type { CollectedJob } from '../normalize';
import { decodeEntities, htmlToText } from '../util/text';
import { errorMessage } from './http';
import type { Collector, CollectResult, FetchLike } from './types';

export interface LinkedInCard {
  id: string;
  title: string;
  company: string;
  location: string | null;
  url: string;
  postedAt: string | null;
}

export interface LinkedInDetail {
  description: string;
  criteria: string[];
  remote: boolean;
}

export interface LinkedInConfig {
  searches: string[];
  location?: string;
  remoteOnly?: boolean;
  pastDays?: number;
  pagesPerSearch?: number;
  maxDetails?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
};

function textOf(block: string, pattern: RegExp): string {
  const match = block.match(pattern);
  return match?.[1]
    ? decodeEntities(match[1].replace(/<[^>]+>/g, ''))
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

export function parseLinkedInSearch(html: string): LinkedInCard[] {
  const cards: LinkedInCard[] = [];
  for (const block of html.match(/<li>[\s\S]*?<\/li>/g) ?? []) {
    const id = block.match(/urn:li:jobPosting:(\d+)/)?.[1];
    const href = block.match(/class="base-card__full-link[^"]*"\s+href="([^"]+)"/)?.[1];
    if (!id || !href) continue;
    const date = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
    cards.push({
      id,
      title: textOf(block, /<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/),
      company: textOf(block, /<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/),
      location: textOf(block, /<span class="job-search-card__location">([\s\S]*?)<\/span>/) || null,
      url: decodeEntities(href).split('?')[0] ?? href,
      postedAt: date ? new Date(`${date}T00:00:00Z`).toISOString() : null,
    });
  }
  return cards;
}

export function parseLinkedInDetail(html: string): LinkedInDetail {
  const markup =
    html.match(/<div class="show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  const criteria = [
    ...html.matchAll(/<span class="description__job-criteria-text[^"]*">([\s\S]*?)<\/span>/g),
  ]
    .map((match) => decodeEntities((match[1] ?? '').replace(/<[^>]+>/g, '')).trim())
    .filter(Boolean);
  const description = htmlToText(markup);
  return {
    description,
    criteria,
    remote: /\b(remote|remoto|teletrabalho|trabalho remoto)\b/i.test(
      `${description} ${criteria.join(' ')}`,
    ),
  };
}

export function normalizeLinkedIn(
  card: LinkedInCard,
  detail: LinkedInDetail | null,
  forceRemote = false,
): CollectedJob | null {
  const header = detail?.criteria.length ? `${detail.criteria.join(' · ')}\n\n` : '';
  const parsed = jobSchema.safeParse({
    source: 'linkedin',
    externalId: card.id,
    title: card.title,
    company: card.company || 'LinkedIn',
    location: card.location,
    remote: forceRemote || detail?.remote === true || /remote|remoto/i.test(card.location ?? ''),
    description: detail
      ? `${header}${detail.description}`
      : `${card.title} · ${card.company} · ${card.location ?? ''}`,
    url: card.url,
    postedAt: card.postedAt,
  });
  return parsed.success
    ? { job: parsed.data, raw: { card, criteria: detail?.criteria ?? [] } }
    : null;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

class BlockedError extends Error {}

async function getHtml(fetchFn: FetchLike, url: string): Promise<string> {
  const response = await fetchFn(url, { headers: BROWSER_HEADERS });
  if (response.status === 429 || response.status === 999 || response.status === 403) {
    throw new BlockedError(`blocked by LinkedIn (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export const linkedInCollector: Collector<LinkedInConfig> = {
  id: 'linkedin',
  async collect(config, fetchFn): Promise<CollectResult> {
    const sleep = config.sleep ?? defaultSleep;
    const delay = config.delayMs ?? 1500;
    const searches = config.searches
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3);
    const pages = Math.min(config.pagesPerSearch ?? 2, 3);
    const maxDetails = config.maxDetails ?? 15;
    const result: CollectResult = { jobs: [], errors: [] };
    const cards = new Map<string, LinkedInCard>();
    let first = true;

    try {
      for (const keywords of searches) {
        for (let page = 0; page < pages; page++) {
          if (!first) await sleep(delay);
          first = false;
          const params = new URLSearchParams({
            keywords,
            location: config.location?.trim() || 'Portugal',
            f_TPR: `r${(config.pastDays ?? 7) * 86400}`,
            sortBy: 'DD',
            start: String(page * 10),
          });
          if (config.remoteOnly) params.set('f_WT', '2');
          const html = await getHtml(
            fetchFn,
            `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`,
          );
          const found = parseLinkedInSearch(html);
          for (const card of found) if (!cards.has(card.id)) cards.set(card.id, card);
          if (found.length < 10) break;
        }
      }

      let fetched = 0;
      for (const card of cards.values()) {
        let detail: LinkedInDetail | null = null;
        if (fetched < maxDetails) {
          await sleep(delay);
          fetched++;
          try {
            detail = parseLinkedInDetail(
              await getHtml(
                fetchFn,
                `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${card.id}`,
              ),
            );
          } catch (error) {
            if (error instanceof BlockedError) throw error;
            result.errors.push(`linkedin/${card.id}: ${errorMessage(error)}`);
          }
        }
        const job = normalizeLinkedIn(card, detail, config.remoteOnly === true);
        if (job) result.jobs.push(job);
      }
    } catch (error) {
      for (const card of cards.values()) {
        if (result.jobs.some((item) => item.job.externalId === card.id)) continue;
        const job = normalizeLinkedIn(card, null, config.remoteOnly === true);
        if (job) result.jobs.push(job);
      }
      result.errors.push(`linkedin: ${errorMessage(error)}`);
    }
    return result;
  },
};
