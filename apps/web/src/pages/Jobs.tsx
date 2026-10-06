import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Card, Field, Input, ScoreBadge, Select, Spinner } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

const STATUSES = ['new', 'seen', 'saved', 'applied', 'discarded'] as const;
const SOURCES = ['remotive', 'arbeitnow', 'remoteok', 'greenhouse', 'lever', 'adzuna', 'itjobs'];

interface MatchRow {
  id: string;
  score: number | null;
  status: (typeof STATUSES)[number];
  created_at: string;
  analysis: { summary?: string } | null;
  jm_jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean;
    source: string;
  };
}

export default function Jobs() {
  const { t } = useTranslation();
  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [onlyRemote, setOnlyRemote] = useState(false);
  const [sort, setSort] = useState<'score' | 'recent'>('score');

  const matches = useAsync(async () => {
    let query = supabase
      .from('jm_job_matches')
      .select(
        'id, score, status, created_at, analysis, jm_jobs!inner(id, title, company, location, remote, source)',
      )
      .gte('score', minScore)
      .limit(150);
    if (source) query = query.eq('jm_jobs.source', source);
    if (status) query = query.eq('status', status);
    if (onlyRemote) query = query.eq('jm_jobs.remote', true);
    query =
      sort === 'score'
        ? query.order('score', { ascending: false, nullsFirst: false })
        : query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as MatchRow[];
  }, [minScore, source, status, onlyRemote, sort]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">{t('jobs.title')}</h1>

      <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label={t('jobs.minScore')}>
          <Input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
          />
        </Field>
        <Field label={t('jobs.source')}>
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{t('jobs.all')}</option>
            {SOURCES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('jobs.status')}>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{t('jobs.all')}</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>
                {t(`jobs.statuses.${item}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('jobs.sort')}>
          <Select value={sort} onChange={(e) => setSort(e.target.value as 'score' | 'recent')}>
            <option value="score">{t('jobs.sortScore')}</option>
            <option value="recent">{t('jobs.sortRecent')}</option>
          </Select>
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={onlyRemote}
            onChange={(e) => setOnlyRemote(e.target.checked)}
          />
          {t('jobs.onlyRemote')}
        </label>
      </Card>

      {matches.loading && <Spinner label={t('common.loading')} />}
      {matches.error && <Alert>{matches.error}</Alert>}
      {matches.data && matches.data.length === 0 && <Card>{t('jobs.empty')}</Card>}

      <ul className="space-y-3">
        {matches.data?.map((match) => (
          <li key={match.id}>
            <Link
              to={`/app/jobs/${match.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-400 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{match.jm_jobs.title}</p>
                  <p className="text-sm text-slate-500">
                    {match.jm_jobs.company}
                    {match.jm_jobs.location ? ` · ${match.jm_jobs.location}` : ''}
                    {match.jm_jobs.remote ? ` · ${t('jobs.remote')}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-slate-500">
                    {t(`jobs.statuses.${match.status}`)}
                  </span>
                  <ScoreBadge score={match.score} />
                </div>
              </div>
              {match.analysis?.summary && (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {match.analysis.summary}
                </p>
              )}
              <p className="mt-2 text-xs text-slate-400">{match.jm_jobs.source}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
