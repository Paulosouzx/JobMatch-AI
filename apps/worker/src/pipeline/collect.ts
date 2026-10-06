import {
  adzunaCollector,
  arbeitnowCollector,
  greenhouseCollector,
  itJobsCollector,
  leverCollector,
  netEmpregosCollector,
  remoteOkCollector,
  remotiveCollector,
  type CollectResult,
  type FetchLike,
} from '@jobmatch/core';
import type { SourceRow, UserSettings } from './types';

export interface SecretsLookup {
  adzunaKey: string | null;
  itjobsKey: string | null;
}

const DEFAULT_ENABLED = ['remotive', 'arbeitnow', 'remoteok', 'netempregos'];

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

export type CollectTask = { id: string; run: (fetchFn: FetchLike) => Promise<CollectResult> };

export function buildCollectTasks(
  sources: SourceRow[],
  settings: Pick<UserSettings, 'adzuna_app_id'>,
  secrets: SecretsLookup,
): CollectTask[] {
  const byType = new Map(sources.map((source) => [source.type, source]));
  const isEnabled = (type: string): boolean => {
    const row = byType.get(type);
    return row ? row.enabled : DEFAULT_ENABLED.includes(type);
  };
  const configOf = (type: string): Record<string, unknown> => byType.get(type)?.config ?? {};
  const tasks: CollectTask[] = [];

  if (isEnabled('remotive')) {
    const config = configOf('remotive');
    tasks.push({
      id: 'remotive',
      run: (f) =>
        remotiveCollector.collect(
          { category: text(config.category), search: text(config.search) },
          f,
        ),
    });
  }
  if (isEnabled('arbeitnow')) {
    tasks.push({ id: 'arbeitnow', run: (f) => arbeitnowCollector.collect({}, f) });
  }
  if (isEnabled('netempregos')) {
    const categories = stringList(configOf('netempregos').categories);
    tasks.push({ id: 'netempregos', run: (f) => netEmpregosCollector.collect({ categories }, f) });
  }
  if (isEnabled('remoteok')) {
    tasks.push({ id: 'remoteok', run: (f) => remoteOkCollector.collect({}, f) });
  }
  const greenhouse = stringList(configOf('greenhouse').companies);
  if (isEnabled('greenhouse') && greenhouse.length > 0) {
    tasks.push({
      id: 'greenhouse',
      run: (f) => greenhouseCollector.collect({ companies: greenhouse }, f),
    });
  }
  const lever = stringList(configOf('lever').companies);
  if (isEnabled('lever') && lever.length > 0) {
    tasks.push({ id: 'lever', run: (f) => leverCollector.collect({ companies: lever }, f) });
  }
  if (isEnabled('adzuna') && secrets.adzunaKey && settings.adzuna_app_id) {
    const config = configOf('adzuna');
    const appId = settings.adzuna_app_id;
    const appKey = secrets.adzunaKey;
    tasks.push({
      id: 'adzuna',
      run: (f) =>
        adzunaCollector.collect(
          {
            appId,
            appKey,
            country: text(config.country) ?? 'gb',
            what: text(config.what),
            where: text(config.where),
          },
          f,
        ),
    });
  }
  if (isEnabled('itjobs') && secrets.itjobsKey) {
    const config = configOf('itjobs');
    const apiKey = secrets.itjobsKey;
    tasks.push({
      id: 'itjobs',
      run: (f) => itJobsCollector.collect({ apiKey, query: text(config.query) }, f),
    });
  }
  return tasks;
}
