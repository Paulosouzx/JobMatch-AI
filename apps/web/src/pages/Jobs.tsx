import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Alert, Card, Field, Input, ScoreBadge, Select, Spinner } from '../components/legacy-ui';
import { evaluationOf, matchOf, type EvaluationState, type JobRow } from '../lib/jobs';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

const STATUSES = ['new', 'seen', 'saved', 'applied', 'discarded'] as const;
const EVALUATIONS: EvaluationState[] = ['scored', 'pending', 'filtered', 'error'];
const SOURCES = ['remotive', 'arbeitnow', 'remoteok', 'greenhouse', 'lever', 'adzuna', 'itjobs'];

const EVALUATION_STYLE: Record<EvaluationState, string> = {
  scored: '',
  pending: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  filtered: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  error: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export default function Jobs() {
  const { t } = useTranslation();
  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [evaluation, setEvaluation] = useState<'' | EvaluationState>('');
  const [onlyRemote, setOnlyRemote] = useState(false);
  const [sort, setSort] = useState<'score' | 'recent'>('recent');

  const jobs = useAsync(async () => {
    let query = supabase
      .from('jm_jobs')
      .select(
        'id, title, company, location, remote, source, url, posted_at, created_at, rule_status, reject_reason, jm_job_matches(id, score, status, error, analysis)',
      )
      .order('created_at', { ascending: false })
      .limit(500);
    if (source) query = query.eq('source', source);
    if (onlyRemote) query = query.eq('remote', true);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as JobRow[];
  }, [source, onlyRemote]);

  const rows = useMemo(() => {
    const list = (jobs.data ?? []).filter((row) => {
      const match = matchOf(row);
      const state = evaluationOf(row);
      if (evaluation && state !== evaluation) return false;
      if (status && (match?.status ?? '') !== status) return false;
      if (minScore > 0 && (match?.score ?? -1) < minScore) return false;
      return true;
    });
    if (sort === 'score') {
      list.sort((a, b) => (matchOf(b)?.score ?? -1) - (matchOf(a)?.score ?? -1));
    }
    return list;
  }, [jobs.data, evaluation, status, minScore, sort]);

  const counts = useMemo(() => {
    const result: Record<EvaluationState, number> = {
      scored: 0,
      pending: 0,
      filtered: 0,
      error: 0,
    };
    for (const row of jobs.data ?? []) result[evaluationOf(row)]++;
    return result;
  }, [jobs.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-semibold">{t('jobs.title')}</h1>
        {jobs.data && (
          <p className="text-sm text-slate-500 tabular-nums">
            {t('jobs.counts', { total: jobs.data.length, ...counts })}
          </p>
        )}
      </div>

      <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Field label={t('jobs.evaluation')}>
          <Select
            value={evaluation}
            onChange={(e) => setEvaluation(e.target.value as '' | EvaluationState)}
          >
            <option value="">{t('jobs.all')}</option>
            {EVALUATIONS.map((item) => (
              <option key={item} value={item}>
                {t(`jobs.evaluations.${item}`)}
              </option>
            ))}
          </Select>
        </Field>
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
            <option value="recent">{t('jobs.sortRecent')}</option>
            <option value="score">{t('jobs.sortScore')}</option>
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

      {jobs.loading && <Spinner label={t('common.loading')} />}
      {jobs.error && <Alert>{jobs.error}</Alert>}
      {jobs.data && rows.length === 0 && <Card>{t('jobs.empty')}</Card>}

      <ul className="space-y-3">
        {rows.map((row) => {
          const match = matchOf(row);
          const state = evaluationOf(row);
          return (
            <li key={row.id}>
              <Link
                to={`/app/jobs/${row.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-400 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="text-sm text-slate-500">
                      {row.company}
                      {row.location ? ` · ${row.location}` : ''}
                      {row.remote ? ` · ${t('jobs.remote')}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {match && (
                      <span className="text-xs text-slate-500">
                        {t(`jobs.statuses.${match.status}`)}
                      </span>
                    )}
                    {state === 'scored' ? (
                      <ScoreBadge score={match?.score ?? null} />
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${EVALUATION_STYLE[state]}`}
                      >
                        {t(`jobs.evaluations.${state}`)}
                      </span>
                    )}
                  </div>
                </div>
                {match?.analysis?.summary && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {match.analysis.summary}
                  </p>
                )}
                {state === 'filtered' && row.reject_reason && (
                  <p className="mt-2 text-xs text-slate-500">
                    {t('jobs.filteredBy', { reason: row.reject_reason })}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {row.source} · {new Date(row.created_at).toLocaleDateString('pt-BR')}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
