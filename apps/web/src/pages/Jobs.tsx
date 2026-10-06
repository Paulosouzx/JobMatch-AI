import { Globe, MapPin, Radar, Search, SearchX, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';
import { ScoreBadge } from '@/components/app/ScoreBadge';
import { StatusBadge, type StatusTone } from '@/components/app/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { evaluationOf, matchOf, type EvaluationState, type JobRow } from '@/lib/jobs';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

const STATUSES = ['new', 'seen', 'saved', 'applied', 'discarded'] as const;
const EVALUATIONS: EvaluationState[] = ['scored', 'pending', 'filtered', 'error'];
const SOURCES = [
  'remotive',
  'arbeitnow',
  'remoteok',
  'netempregos',
  'greenhouse',
  'lever',
  'adzuna',
  'itjobs',
];
const SCORE_STEPS = ['0', '50', '70', '80', '90'];
const ALL = 'all';

const EVALUATION_TONE: Record<EvaluationState, StatusTone> = {
  scored: 'success',
  pending: 'primary',
  filtered: 'neutral',
  error: 'danger',
};

const STATUS_TONE: Record<(typeof STATUSES)[number], StatusTone> = {
  new: 'primary',
  seen: 'neutral',
  saved: 'info',
  applied: 'success',
  discarded: 'neutral',
};

function ListSkeleton() {
  return (
    <div className="divide-y rounded-xl border bg-card">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-4 py-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-11 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function Jobs() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [evaluation, setEvaluation] = useState<string>(ALL);
  const [minScore, setMinScore] = useState('0');
  const [source, setSource] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [onlyRemote, setOnlyRemote] = useState(false);
  const [sort, setSort] = useState<'recent' | 'score'>('recent');

  const jobs = useAsync(async () => {
    const { data, error } = await supabase
      .from('jm_jobs')
      .select(
        'id, title, company, location, remote, source, url, posted_at, created_at, rule_status, reject_reason, jm_job_matches(id, score, status, error, analysis)',
      )
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as JobRow[];
  }, []);

  const all = jobs.data ?? [];

  const counts = useMemo(() => {
    const result: Record<EvaluationState, number> = {
      scored: 0,
      pending: 0,
      filtered: 0,
      error: 0,
    };
    for (const row of all) result[evaluationOf(row)]++;
    return result;
  }, [all]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = Number(minScore);
    const list = all.filter((row) => {
      const match = matchOf(row);
      if (evaluation !== ALL && evaluationOf(row) !== evaluation) return false;
      if (source !== ALL && row.source !== source) return false;
      if (status !== ALL && match?.status !== status) return false;
      if (onlyRemote && !row.remote) return false;
      if (min > 0 && (match?.score ?? -1) < min) return false;
      if (needle && !`${row.title} ${row.company}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    if (sort === 'score')
      list.sort((a, b) => (matchOf(b)?.score ?? -1) - (matchOf(a)?.score ?? -1));
    return list;
  }, [all, query, evaluation, source, status, onlyRemote, minScore, sort]);

  const filtersActive =
    query !== '' ||
    evaluation !== ALL ||
    source !== ALL ||
    status !== ALL ||
    onlyRemote ||
    minScore !== '0';

  function clearFilters() {
    setQuery('');
    setEvaluation(ALL);
    setSource(ALL);
    setStatus(ALL);
    setOnlyRemote(false);
    setMinScore('0');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('jobs.title')}
        description={
          jobs.data && all.length > 0
            ? t('jobs.counts', { total: all.length, ...counts })
            : t('jobs.pageDescription')
        }
      />

      <div className="space-y-3">
        <Tabs value={evaluation} onValueChange={setEvaluation}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value={ALL} className="gap-2">
              {t('jobs.allEvaluations')}
              <Badge variant="secondary" className="tabular-nums">
                {all.length}
              </Badge>
            </TabsTrigger>
            {EVALUATIONS.map((item) => (
              <TabsTrigger key={item} value={item} className="gap-2">
                {t(`jobs.evaluations.${item}`)}
                <Badge variant="secondary" className="tabular-nums">
                  {counts[item]}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('jobs.searchPlaceholder')}
              aria-label={t('jobs.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Select value={minScore} onValueChange={setMinScore}>
              <SelectTrigger className="w-full sm:w-40" aria-label={t('jobs.minScore')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCORE_STEPS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value === '0' ? t('jobs.anyScore') : t('jobs.scoreAtLeast', { value })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-full sm:w-40" aria-label={t('jobs.source')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('jobs.allSources')}</SelectItem>
                {SOURCES.map((item) => (
                  <SelectItem key={item} value={item} className="capitalize">
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full sm:w-44" aria-label={t('jobs.status')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('jobs.allStatuses')}</SelectItem>
                {STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`jobs.statuses.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as 'recent' | 'score')}>
              <SelectTrigger className="w-full sm:w-40" aria-label={t('jobs.sort')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">{t('jobs.sortRecent')}</SelectItem>
                <SelectItem value="score">{t('jobs.sortScore')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="col-span-2 flex h-9 items-center gap-2 rounded-md border px-3 sm:col-span-1">
              <Switch id="only-remote" checked={onlyRemote} onCheckedChange={setOnlyRemote} />
              <Label htmlFor="only-remote" className="font-normal">
                {t('jobs.onlyRemote')}
              </Label>
            </div>
            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="col-span-2 sm:col-span-1"
              >
                <X />
                {t('jobs.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {jobs.loading && <ListSkeleton />}
      {jobs.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {jobs.error}
        </p>
      )}

      {jobs.data && all.length === 0 && (
        <EmptyState
          icon={Radar}
          title={t('jobs.emptyTitle')}
          description={t('jobs.emptyText')}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/app/settings">{t('jobs.goSettings')}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/app/runs">{t('jobs.goRuns')}</Link>
              </Button>
            </div>
          }
        />
      )}

      {jobs.data && all.length > 0 && rows.length === 0 && (
        <EmptyState
          icon={SearchX}
          title={t('jobs.noResultsTitle')}
          description={t('jobs.noResultsText')}
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t('jobs.clearFilters')}
            </Button>
          }
        />
      )}

      {rows.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {rows.map((row) => {
            const match = matchOf(row);
            const state = evaluationOf(row);
            return (
              <li key={row.id}>
                <Link
                  to={`/app/jobs/${row.id}`}
                  className="flex items-start gap-4 px-4 py-4 transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium text-foreground">{row.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">{row.company}</span>
                      {row.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5" aria-hidden="true" />
                          {row.location}
                        </span>
                      )}
                      {row.remote && (
                        <span className="inline-flex items-center gap-1">
                          <Globe className="size-3.5" aria-hidden="true" />
                          {t('jobs.remote')}
                        </span>
                      )}
                      <span className="capitalize">{row.source}</span>
                      <span className="tabular-nums">
                        {t('jobs.collectedOn', {
                          date: new Date(row.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                          }),
                        })}
                      </span>
                    </div>
                    {match?.analysis?.summary && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {match.analysis.summary}
                      </p>
                    )}
                    {state === 'filtered' && row.reject_reason && (
                      <p className="text-xs text-muted-foreground">
                        {t('jobs.filteredBy', { reason: row.reject_reason })}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {match && state === 'scored' && (
                      <StatusBadge
                        tone={STATUS_TONE[match.status]}
                        className="hidden sm:inline-flex"
                      >
                        {t(`jobs.statuses.${match.status}`)}
                      </StatusBadge>
                    )}
                    {state === 'scored' && match?.score !== null && match?.score !== undefined ? (
                      <ScoreBadge score={match.score} />
                    ) : (
                      <StatusBadge tone={EVALUATION_TONE[state]}>
                        {t(`jobs.evaluations.${state}`)}
                      </StatusBadge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
