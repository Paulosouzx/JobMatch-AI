import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Card, ScoreBadge, Spinner, Textarea } from '../components/ui';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

type Status = 'new' | 'seen' | 'saved' | 'applied' | 'discarded';

interface Detail {
  id: string;
  job_id: string;
  score: number | null;
  status: Status;
  error: string | null;
  analysis: {
    reasons?: string[];
    matched_skills?: string[];
    missing_skills?: string[];
    seniority_fit?: string;
    location_fit?: string;
    summary?: string;
  } | null;
  jm_jobs: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean;
    description: string;
    url: string;
    source: string;
  };
}

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

export default function JobDetail() {
  const { t } = useTranslation();
  const { matchId = '' } = useParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [letter, setLetter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const detail = useAsync(async () => {
    const { data, error } = await supabase
      .from('jm_job_matches')
      .select(
        'id, job_id, score, status, error, analysis, jm_jobs!inner(id, title, company, location, remote, description, url, source)',
      )
      .eq('id', matchId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const application = await supabase
      .from('jm_applications')
      .select('cover_letter')
      .eq('job_id', data.job_id)
      .maybeSingle();
    return { match: data as unknown as Detail, letter: application.data?.cover_letter ?? '' };
  }, [matchId]);

  useEffect(() => {
    if (!detail.data) return;
    setStatus(detail.data.match.status);
    setLetter(detail.data.letter);
    if (detail.data.match.status === 'new') {
      void supabase
        .from('jm_job_matches')
        .update({ status: 'seen' })
        .eq('id', matchId)
        .then(() => setStatus('seen'));
    }
  }, [detail.data, matchId]);

  if (detail.loading) return <Spinner label={t('common.loading')} />;
  if (detail.error) return <Alert>{detail.error}</Alert>;
  if (!detail.data) return <Alert>{t('jobs.notFound')}</Alert>;

  const { match } = detail.data;
  const job = match.jm_jobs;
  const analysis = match.analysis;

  async function changeStatus(next: Status) {
    const { error } = await supabase
      .from('jm_job_matches')
      .update({ status: next })
      .eq('id', match.id);
    if (error) return setMessage({ kind: 'error', text: error.message });
    setStatus(next);
    if (next === 'applied') {
      await supabase.from('jm_applications').upsert(
        {
          job_id: match.job_id,
          status: 'applied',
          applied_at: new Date().toISOString(),
          user_id: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: 'job_id' },
      );
    }
  }

  async function generate() {
    setGenerating(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
      body: { jobId: match.job_id },
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase
      .from('jm_applications')
      .upsert(
        { user_id: userId, job_id: match.job_id, cover_letter: letter },
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
      <Link to="/app" className="text-sm text-indigo-600 hover:underline">
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
          <ScoreBadge score={match.score} />
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
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
          <Button variant="secondary" onClick={() => void changeStatus('saved')}>
            {t('jobs.save')}
          </Button>
          <Button variant="ghost" onClick={() => void changeStatus('discarded')}>
            {t('jobs.discard')}
          </Button>
          {status && (
            <span className="self-center text-sm text-slate-500">
              {t(`jobs.statuses.${status}`)}
            </span>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-semibold">{t('jobs.analysis')}</h2>
        {!analysis && <p className="text-sm text-slate-500">{match.error ?? t('jobs.noScore')}</p>}
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
