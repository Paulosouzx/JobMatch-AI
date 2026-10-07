import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  Banknote,
  Copy,
  ExternalLink,
  FileText,
  Gift,
  ListChecks,
  Wand2,
  Globe,
  Loader2,
  MapPin,
  Laptop,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { findBannedPhrases, replaceDashes, sentencesWithBannedPhrases } from '@jobmatch/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ScoreBadge } from '@/components/app/ScoreBadge';
import { HighlightedText } from '@/components/resume/HighlightedText';
import { StatusBadge, type StatusTone } from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { callFunction } from '@/lib/functions';
import { loadStyleGuide } from '@/lib/resume';
import {
  evaluationOf,
  matchOf,
  type EvaluationState,
  type JobRow,
  type MatchStatus,
} from '@/lib/jobs';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type Loaded =
  { kind: 'job'; job: JobRow; letter: string } | { kind: 'redirect'; jobId: string } | null;

const EVALUATION_TONE: Record<EvaluationState, StatusTone> = {
  scored: 'success',
  pending: 'primary',
  filtered: 'neutral',
  error: 'danger',
};

function Chips({ items, tone }: { items: string[]; tone: 'success' | 'danger' }) {
  const style =
    tone === 'success'
      ? 'bg-success/10 text-success ring-success/20'
      : 'bg-destructive/10 text-destructive ring-destructive/20';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-3 rounded-xl border p-6">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-9 w-full sm:w-96" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export default function JobDetail() {
  const { t } = useTranslation();
  const { jobId = '' } = useParams();
  const [status, setStatus] = useState<MatchStatus | null>(null);
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState<'generate' | 'save' | 'status' | 'analyze' | 'fix' | null>(null);
  const guide = useAsync(loadStyleGuide, []);
  const banned = guide.data?.bannedPhrases ?? [];

  const detail = useAsync<Loaded>(async () => {
    const { data, error } = await supabase
      .from('jm_jobs')
      .select(
        'id, title, company, location, remote, source, url, posted_at, created_at, rule_status, reject_reason, description, jm_job_matches(id, score, status, error, analysis)',
      )
      .eq('id', jobId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      const { data: legacy } = await supabase
        .from('jm_job_matches')
        .select('job_id')
        .eq('id', jobId)
        .maybeSingle();
      return legacy ? { kind: 'redirect', jobId: legacy.job_id as string } : null;
    }
    const application = await supabase
      .from('jm_applications')
      .select('cover_letter')
      .eq('job_id', jobId)
      .maybeSingle();
    return {
      kind: 'job',
      job: data as unknown as JobRow,
      letter: application.data?.cover_letter ?? '',
    };
  }, [jobId]);

  const loaded = detail.data;
  const match = loaded?.kind === 'job' ? matchOf(loaded.job) : null;

  useEffect(() => {
    if (loaded?.kind !== 'job') return;
    setLetter(loaded.letter);
    const current = matchOf(loaded.job);
    setStatus(current?.status ?? null);
    if (current?.status === 'new') {
      void supabase
        .from('jm_job_matches')
        .update({ status: 'seen' })
        .eq('id', current.id)
        .then(() => setStatus('seen'));
    }
  }, [loaded]);

  if (detail.loading) return <DetailSkeleton />;
  if (detail.error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
      >
        {detail.error}
      </p>
    );
  }
  if (!loaded) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/app">
            <ArrowLeft />
            {t('jobs.backToJobs')}
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{t('jobs.notFound')}</p>
      </div>
    );
  }
  if (loaded.kind === 'redirect') return <Navigate to={`/app/jobs/${loaded.jobId}`} replace />;

  const job = loaded.job;
  const state = evaluationOf(job);
  const analysis = match?.analysis ?? null;

  async function userId() {
    return (await supabase.auth.getUser()).data.user?.id;
  }

  async function changeStatus(next: MatchStatus) {
    setBusy('status');
    if (match) {
      const { error } = await supabase
        .from('jm_job_matches')
        .update({ status: next })
        .eq('id', match.id);
      if (error) {
        setBusy(null);
        toast.error(t('common.error'), { description: error.message });
        return;
      }
      setStatus(next);
    }
    if (next === 'applied') {
      const { error } = await supabase.from('jm_applications').upsert(
        {
          job_id: job.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
          user_id: await userId(),
        },
        { onConflict: 'job_id' },
      );
      if (error) {
        setBusy(null);
        toast.error(t('common.error'), { description: error.message });
        return;
      }
      if (!match) setStatus('applied');
    }
    setBusy(null);
    toast.success(t('jobs.statusUpdated'), { description: t(`jobs.statuses.${next}`) });
  }

  async function analyze() {
    setBusy('analyze');
    const id = toast.loading(t('jobs.analyzing'));
    const { error } = await callFunction('ai', { action: 'analyze-job', jobId: job.id });
    setBusy(null);
    if (error) {
      toast.error(t('jobs.analyzeFailed'), { id, description: error });
      return;
    }
    toast.success(t('jobs.analyzed'), { id });
    detail.reload();
  }

  async function fixLetter() {
    const sentences = sentencesWithBannedPhrases(letter, banned);
    if (sentences.length === 0) return;
    setBusy('fix');
    const id = toast.loading(t('adapt.fixing'));
    const { data, error } = await callFunction<{ sentences: string[] }>('ai', {
      action: 'fix-text',
      sentences,
    });
    setBusy(null);
    if (error || !data) {
      toast.error(t('adapt.fixFailed'), { id, description: error ?? undefined });
      return;
    }
    let next = letter;
    sentences.forEach((sentence, index) => {
      next = next.replace(sentence, data.sentences[index] ?? sentence);
    });
    setLetter(replaceDashes(next));
    toast.success(t('adapt.fixed', { count: sentences.length }), { id });
  }

  async function generate() {
    setBusy('generate');
    const id = toast.loading(t('jobs.generating'));
    const { data, error } = await callFunction<{ text: string }>('ai', {
      action: 'cover-letter',
      jobId: job.id,
    });
    setBusy(null);
    if (error || !data || typeof data.text !== 'string') {
      toast.error(t('jobs.letterFailed'), { id, description: error ?? undefined });
      return;
    }
    setLetter(data.text);
    toast.success(t('jobs.letterGenerated'), { id });
  }

  async function saveLetter() {
    setBusy('save');
    const { error } = await supabase
      .from('jm_applications')
      .upsert(
        { user_id: await userId(), job_id: job.id, cover_letter: letter },
        { onConflict: 'job_id' },
      );
    setBusy(null);
    if (error) toast.error(t('common.error'), { description: error.message });
    else toast.success(t('jobs.letterSaved'));
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(letter);
    toast.success(t('jobs.copied'));
  }

  const posted = job.posted_at ?? job.created_at;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/app">
          <ArrowLeft />
          {t('jobs.backToJobs')}
        </Link>
      </Button>

      <Card className="gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <h1 className="text-xl font-semibold tracking-tight break-words sm:text-2xl">
              {job.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{job.company}</span>
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-4" aria-hidden="true" />
                  {job.location}
                </span>
              )}
              {job.remote && (
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-4" aria-hidden="true" />
                  {t('jobs.remote')}
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <CalendarDays className="size-4" aria-hidden="true" />
                {t('jobs.postedOn', {
                  date: new Date(posted).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  }),
                })}
              </span>
              {analysis?.work_mode && analysis.work_mode !== 'unknown' && (
                <span className="inline-flex items-center gap-1">
                  <Laptop className="size-4" aria-hidden="true" />
                  {t(`profile.modes.${analysis.work_mode}`)}
                </span>
              )}
              {analysis?.salary && (
                <span className="inline-flex items-center gap-1 font-medium text-success">
                  <Banknote className="size-4" aria-hidden="true" />
                  {analysis.salary}
                </span>
              )}
              <span className="capitalize">{job.source}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {state === 'scored' && match?.score !== null && match?.score !== undefined ? (
              <ScoreBadge score={match.score} className="h-9 min-w-14 text-base" />
            ) : (
              <StatusBadge tone={EVALUATION_TONE[state]}>
                {t(`jobs.evaluations.${state}`)}
              </StatusBadge>
            )}
            {status && <StatusBadge tone="neutral">{t(`jobs.statuses.${status}`)}</StatusBadge>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button asChild className="col-span-2 sm:col-span-1">
            <a href={job.url} target="_blank" rel="noreferrer noopener">
              <ExternalLink />
              {t('jobs.openJob')}
            </a>
          </Button>
          <Button
            variant="success"
            disabled={busy !== null || status === 'applied'}
            onClick={() => void changeStatus('applied')}
            className="col-span-2 sm:col-span-1"
          >
            <Check />
            {t('jobs.markApplied')}
          </Button>
          <Button asChild variant="outline" className="col-span-2 sm:col-span-1">
            <Link to={`/app/jobs/${job.id}/resume`}>
              <FileText />
              {t('jobs.adaptResume')}
            </Link>
          </Button>
          {match && (
            <>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => void changeStatus('saved')}
              >
                <Bookmark />
                {t('jobs.save')}
              </Button>
              <Button
                variant="destructive-outline"
                disabled={busy !== null}
                onClick={() => void changeStatus('discarded')}
              >
                <X />
                {t('jobs.discard')}
              </Button>
            </>
          )}
        </div>
      </Card>

      {(() => {
        const required = analysis?.requirements_required ?? [];
        const nice = analysis?.requirements_nice ?? [];
        const benefits = analysis?.benefits ?? [];
        const hasDetails = analysis?.requirements_required !== undefined;
        if (!hasDetails) {
          return (
            <Card className="flex-row flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-start gap-3">
                <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{t('jobs.detailsMissing')}</p>
                  <p className="text-xs text-muted-foreground">{t('jobs.detailsMissingHint')}</p>
                </div>
              </div>
              <Button
                variant="outline"
                disabled={busy !== null}
                onClick={() => void analyze()}
                className="w-full sm:w-auto"
              >
                {busy === 'analyze' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {t('jobs.analyzeJob')}
              </Button>
            </Card>
          );
        }
        return (
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="size-4 text-primary" aria-hidden="true" />
                  {t('jobs.requirementsTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-5 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {t('jobs.required')}
                  </p>
                  {required.length === 0 ? (
                    <p className="text-muted-foreground">{t('jobs.notStated')}</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {required.map((item) => (
                        <li key={item} className="flex gap-2">
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {nice.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t('jobs.niceToHave')}
                    </p>
                    <ul className="space-y-1.5 text-muted-foreground">
                      {nice.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
                            aria-hidden="true"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="size-4 text-primary" aria-hidden="true" />
                  {t('jobs.offersTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-5 text-sm">
                {analysis?.salary && (
                  <p className="flex items-center gap-2 font-medium">
                    <Banknote className="size-4 text-success" aria-hidden="true" />
                    {analysis.salary}
                  </p>
                )}
                {benefits.length === 0 ? (
                  <p className="text-muted-foreground">{t('jobs.notStated')}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {benefits.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="gap-0 py-0 lg:col-span-2">
          <CardHeader className="border-b py-5">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              {t('jobs.analysis')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 py-5">
            {state === 'pending' && (
              <p className="text-sm text-muted-foreground">{t('jobs.pendingAnalysis')}</p>
            )}
            {state === 'filtered' && (
              <p className="text-sm text-muted-foreground">
                {t('jobs.filteredAnalysis', { reason: job.reject_reason ?? '-' })}
              </p>
            )}
            {state === 'error' && (
              <p className="text-sm break-words text-muted-foreground">
                {match?.error ?? t('jobs.noScore')}
              </p>
            )}
            {analysis?.summary && <p className="text-sm leading-relaxed">{analysis.summary}</p>}
            {analysis?.reasons && analysis.reasons.length > 0 && (
              <ul className="space-y-2 text-sm">
                {analysis.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {analysis?.matched_skills && analysis.matched_skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('jobs.matched')}
                </p>
                <Chips items={analysis.matched_skills} tone="success" />
              </div>
            )}
            {analysis?.missing_skills && analysis.missing_skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t('jobs.missing')}
                </p>
                <Chips items={analysis.missing_skills} tone="danger" />
              </div>
            )}
            {analysis && (
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{t('jobs.seniorityFit')}</dt>
                  <dd className="font-medium">
                    {analysis.seniority_fit
                      ? t(`jobs.fit.${analysis.seniority_fit}`, {
                          defaultValue: analysis.seniority_fit,
                        })
                      : '—'}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{t('jobs.locationFit')}</dt>
                  <dd className="font-medium">
                    {analysis.location_fit
                      ? t(`jobs.fit.${analysis.location_fit}`, {
                          defaultValue: analysis.location_fit,
                        })
                      : '—'}
                  </dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0 lg:col-span-3">
          <CardHeader className="border-b py-5">
            <CardTitle className="text-base">{t('jobs.coverLetter')}</CardTitle>
            <CardDescription>{t('jobs.letterHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            <Textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              placeholder={t('jobs.letterEmpty')}
              className="min-h-56 text-sm leading-relaxed"
              aria-label={t('jobs.coverLetter')}
            />
            {letter !== '' && findBannedPhrases(letter, banned).length > 0 && (
              <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <p className="text-xs font-medium">
                  {t('jobs.bannedFound', { count: findBannedPhrases(letter, banned).length })}
                </p>
                <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
                  <HighlightedText text={letter} banned={banned} />
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void fixLetter()}
                >
                  {busy === 'fix' ? <Loader2 className="animate-spin" /> : <Wand2 />}
                  {t('adapt.fixBanned')}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Button
                className="col-span-2 sm:col-span-1"
                disabled={busy !== null}
                onClick={() => void generate()}
              >
                {busy === 'generate' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                {busy === 'generate' ? t('jobs.generating') : t('jobs.generateLetter')}
              </Button>
              <Button
                variant="outline"
                disabled={letter === '' || busy !== null}
                onClick={() => void saveLetter()}
              >
                {busy === 'save' ? <Loader2 className="animate-spin" /> : <Save />}
                {t('jobs.saveLetter')}
              </Button>
              <Button variant="outline" disabled={letter === ''} onClick={() => void copyLetter()}>
                <Copy />
                {t('common.copy')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle className="text-base">{t('jobs.description')}</CardTitle>
        </CardHeader>
        <CardContent className="py-5">
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-muted-foreground">
            {job.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
