import { Activity, CircleAlert, CircleCheck } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';
import { StatCard } from '@/components/app/StatCard';
import { StatusBadge } from '@/components/app/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

interface RunLog {
  id: string;
  started_at: string;
  duration_ms: number | null;
  collected: number;
  new_jobs: number;
  filtered_out: number;
  scored: number;
  notified: number;
  llm_calls: number;
  errors: string[];
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms: number | null) {
  if (ms === null) return '—';
  return ms < 60_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 60_000)}min`;
}

function ErrorList({ errors }: { errors: string[] }) {
  const { t } = useTranslation();
  if (errors.length === 0) return <StatusBadge tone="success">{t('runs.ok')}</StatusBadge>;
  return (
    <details className="group">
      <summary className="list-none [&::-webkit-details-marker]:hidden">
        <StatusBadge tone="danger">{t('runs.withErrors', { count: errors.length })}</StatusBadge>
      </summary>
      <ul className="mt-2 max-w-md space-y-1 text-xs break-words text-muted-foreground">
        {errors.map((message, index) => (
          <li key={index} className="rounded-md bg-muted/60 px-2 py-1">
            {message}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Runs() {
  const { t } = useTranslation();
  const runs = useAsync(async () => {
    const { data, error } = await supabase
      .from('jm_run_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []) as RunLog[];
  }, []);

  const summary = useMemo(() => {
    const list = runs.data ?? [];
    const recent = list.slice(0, 10);
    return {
      last: list[0] ? formatDate(list[0].started_at) : t('runs.never'),
      collected: recent.reduce((sum, run) => sum + run.collected, 0),
      scored: recent.reduce((sum, run) => sum + run.scored, 0),
      failing: recent.filter((run) => run.errors.length > 0).length,
      trend: recent.map((run) => run.collected).reverse(),
      scoredTrend: recent.map((run) => run.scored).reverse(),
    };
  }, [runs.data, t]);

  const metrics: { key: keyof RunLog; label: string }[] = [
    { key: 'collected', label: t('runs.collected') },
    { key: 'new_jobs', label: t('runs.newJobs') },
    { key: 'filtered_out', label: t('runs.filtered') },
    { key: 'scored', label: t('runs.scored') },
    { key: 'notified', label: t('runs.notified') },
    { key: 'llm_calls', label: t('runs.llmCalls') },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t('runs.title')} description={t('runs.description')} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('runs.lastRun')}
          value={<span className="text-xl">{summary.last}</span>}
          loading={runs.loading}
        />
        <StatCard
          label={t('runs.totalCollected')}
          value={summary.collected}
          trend={summary.trend}
          loading={runs.loading}
        />
        <StatCard
          label={t('runs.totalScored')}
          value={summary.scored}
          trend={summary.scoredTrend}
          chartColor="var(--chart-3)"
          loading={runs.loading}
        />
        <StatCard label={t('runs.totalErrors')} value={summary.failing} loading={runs.loading} />
      </section>

      {runs.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {runs.error}
        </p>
      )}

      {runs.loading && (
        <div className="space-y-2 rounded-xl border p-4">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      )}

      {runs.data && runs.data.length === 0 && (
        <EmptyState icon={Activity} title={t('runs.empty')} description={t('runs.emptyText')} />
      )}

      {runs.data && runs.data.length > 0 && (
        <>
          <ul className="space-y-3 md:hidden">
            {runs.data.map((run) => (
              <li key={run.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    {run.errors.length === 0 ? (
                      <CircleCheck className="size-4 text-success" aria-hidden="true" />
                    ) : (
                      <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
                    )}
                    {formatDate(run.started_at)}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDuration(run.duration_ms)}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2">
                  {metrics.map((metric) => (
                    <div key={metric.key} className="rounded-lg bg-muted/50 px-2 py-1.5">
                      <dt className="truncate text-[11px] text-muted-foreground">{metric.label}</dt>
                      <dd className="text-sm font-semibold tabular-nums">
                        {run[metric.key] as number}
                      </dd>
                    </div>
                  ))}
                </dl>
                {run.errors.length > 0 && (
                  <div className="mt-3">
                    <ErrorList errors={run.errors} />
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('runs.when')}</TableHead>
                  <TableHead className="text-right">{t('runs.duration')}</TableHead>
                  {metrics.map((metric) => (
                    <TableHead key={metric.key} className="text-right">
                      {metric.label}
                    </TableHead>
                  ))}
                  <TableHead>{t('runs.errors')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.data.map((run) => (
                  <TableRow key={run.id} className="align-top">
                    <TableCell className="font-medium whitespace-nowrap">
                      {formatDate(run.started_at)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {formatDuration(run.duration_ms)}
                    </TableCell>
                    {metrics.map((metric) => (
                      <TableCell key={metric.key} className="text-right tabular-nums">
                        {run[metric.key] as number}
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-normal">
                      <ErrorList errors={run.errors} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
