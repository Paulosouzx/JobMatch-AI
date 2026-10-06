import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, ScoreBadge, Spinner, Textarea } from '../components/legacy-ui';
import { evaluationOf, matchOf, type JobRow, type MatchStatus } from '../lib/jobs';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

function Chips({ items, tone }: { items: string[]; tone: 'good' | 'bad' }) {
  const style =
    tone === 'good'
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className={`rounded-full px-2.5 py-1 text-xs ${style}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

type Loaded =
  { kind: 'job'; job: JobRow; letter: string } | { kind: 'redirect'; jobId: string } | null;

export default function JobDetail() {
  const { t } = useTranslation();
  const { jobId = '' } = useParams();
  const [status, setStatus] = useState<MatchStatus | null>(null);
  const [letter, setLetter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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

  if (detail.loading) return <Spinner label={t('common.loading')} />;
  if (detail.error) return <Alert>{detail.error}</Alert>;
  if (!loaded) return <Alert>{t('jobs.notFound')}</Alert>;
  if (loaded.kind === 'redirect') return <Navigate to={`/app/jobs/${loaded.jobId}`} replace />;

  const job = loaded.job;
  const state = evaluationOf(job);
  const analysis = match?.analysis ?? null;

  async function userId() {
    return (await supabase.auth.getUser()).data.user?.id;
  }

  async function changeStatus(next: MatchStatus) {
    if (match) {
      const { error } = await supabase
        .from('jm_job_matches')
        .update({ status: next })
        .eq('id', match.id);
      if (error) return setMessage({ kind: 'error', text: error.message });
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
      if (error) return setMessage({ kind: 'error', text: error.message });
      if (!match) setMessage({ kind: 'success', text: t('jobs.statuses.applied') });
    }
  }

  async function generate() {
    setGenerating(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
      body: { jobId: job.id },
    });
    setGenerating(false);
    if (error || !data || typeof data.text !== 'string') {
      setMessage({
        kind: 'error',
        text: typeof data?.error === 'string' ? data.error : t('common.error'),
      });
      return;
    }
    setLetter(data.text);
  }

  async function saveLetter() {
    const { error } = await supabase
      .from('jm_applications')
      .upsert(
        { user_id: await userId(), job_id: job.id, cover_letter: letter },
        { onConflict: 'job_id' },
      );
    setMessage(
      error ? { kind: 'error', text: error.message } : { kind: 'success', text: t('common.saved') },
    );
  }

  async function copyLetter() {
    await navigator.clipboard.writeText(letter);
    setMessage({ kind: 'success', text: t('common.copied') });
  }

  return (
    <div className="space-y-5">
      <Link to="/app" className="text-sm text-brand-600 hover:underline">
        {t('common.back')}
      </Link>

      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">{job.title}</h1>
            <p className="text-slate-500">
              {job.company}
              {job.location ? ` · ${job.location}` : ''}
              {job.remote ? ` · ${t('jobs.remote')}` : ''}
            </p>
          </div>
          {state === 'scored' ? (
            <ScoreBadge score={match?.score ?? null} />
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t(`jobs.evaluations.${state}`)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            {t('jobs.openJob')}
          </a>
          <Button
            variant="secondary"
            disabled={status === 'applied'}
            onClick={() => void changeStatus('applied')}
          >
            {t('jobs.markApplied')}
          </Button>
          {match && (
            <>
              <Button variant="secondary" onClick={() => void changeStatus('saved')}>
                {t('jobs.save')}
              </Button>
              <Button variant="ghost" onClick={() => void changeStatus('discarded')}>
                {t('jobs.discard')}
              </Button>
            </>
          )}
          {status && (
            <span className="self-center text-sm text-slate-500">
              {t(`jobs.statuses.${status}`)}
            </span>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('jobs.analysis')}</h2>
        {state === 'pending' && (
          <p className="text-sm text-slate-500">{t('jobs.pendingAnalysis')}</p>
        )}
        {state === 'filtered' && (
          <p className="text-sm text-slate-500">
            {t('jobs.filteredAnalysis', { reason: job.reject_reason ?? '-' })}
          </p>
        )}
        {state === 'error' && (
          <p className="text-sm text-slate-500">{match?.error ?? t('jobs.noScore')}</p>
        )}
        {analysis?.summary && <p>{analysis.summary}</p>}
        {analysis?.reasons && (
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {analysis.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}
        {analysis?.matched_skills && analysis.matched_skills.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t('jobs.matched')}</p>
            <Chips items={analysis.matched_skills} tone="good" />
          </div>
        )}
        {analysis?.missing_skills && analysis.missing_skills.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{t('jobs.missing')}</p>
            <Chips items={analysis.missing_skills} tone="bad" />
          </div>
        )}
        {analysis && (
          <p className="text-sm text-slate-500">
            {t('jobs.seniorityFit')}: {analysis.seniority_fit ?? '-'} · {t('jobs.locationFit')}:{' '}
            {analysis.location_fit ?? '-'}
          </p>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('jobs.coverLetter')}</h2>
        <Textarea rows={12} value={letter} onChange={(e) => setLetter(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button disabled={generating} onClick={() => void generate()}>
            {generating ? t('jobs.generating') : t('jobs.generateLetter')}
          </Button>
          <Button variant="secondary" disabled={letter === ''} onClick={() => void saveLetter()}>
            {t('jobs.saveLetter')}
          </Button>
          <Button variant="secondary" disabled={letter === ''} onClick={() => void copyLetter()}>
            {t('common.copy')}
          </Button>
        </div>
        {message && <Alert kind={message.kind}>{message.text}</Alert>}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">{t('jobs.description')}</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
          {job.description}
        </p>
      </Card>
    </div>
  );
}
