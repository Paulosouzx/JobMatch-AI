import { describe, expect, it } from 'vitest';
import { buildCollectTasks } from './collect';

const noSecrets = { adzunaKey: null, itjobsKey: null };

describe('buildCollectTasks', () => {
  it('uses free default sources when the user has none configured', () => {
    const tasks = buildCollectTasks([], { adzuna_app_id: null }, noSecrets);
    expect(tasks.map((t) => t.id)).toEqual(['remotive', 'arbeitnow', 'netempregos', 'remoteok']);
  });

  it('respects disabled sources and company boards', () => {
    const tasks = buildCollectTasks(
      [
        { type: 'remotive', enabled: false, config: {} },
        { type: 'greenhouse', enabled: true, config: { companies: ['gitlab'] } },
        { type: 'lever', enabled: true, config: { companies: [] } },
      ],
      { adzuna_app_id: null },
      noSecrets,
    );
    expect(tasks.map((t) => t.id)).toEqual(['arbeitnow', 'netempregos', 'remoteok', 'greenhouse']);
  });

  it('only enables keyed sources when keys exist', () => {
    const rows = [
      { type: 'adzuna', enabled: true, config: { country: 'pt' } },
      { type: 'itjobs', enabled: true, config: {} },
    ];
    expect(
      buildCollectTasks(rows, { adzuna_app_id: 'id' }, noSecrets).map((t) => t.id),
    ).not.toContain('adzuna');
    const withKeys = buildCollectTasks(
      rows,
      { adzuna_app_id: 'id' },
      { adzunaKey: 'k', itjobsKey: 'k' },
    );
    expect(withKeys.map((t) => t.id)).toEqual(expect.arrayContaining(['adzuna', 'itjobs']));
  });
});
