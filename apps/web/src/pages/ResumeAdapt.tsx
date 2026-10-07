import {
  findBannedPhrases,
  finalFields,
  replaceDashes,
  sentencesWithBannedPhrases,
  type FieldReview,
} from '@jobmatch/core';
import { ArrowLeft, Check, FileDown, Loader2, Save, Sparkles, Wand2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';
import { StatusBadge, type StatusTone } from '@/components/app/StatusBadge';
import { HighlightedText } from '@/components/resume/HighlightedText';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { callFunction } from '@/lib/functions';
import { fieldLabel, loadStyleGuide, loadTemplate, type ResumeVersionRow } from '@/lib/resume';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

const STATUS_TONE: Record<FieldReview['status'], StatusTone> = {
  changed: 'primary',
  unchanged: 'neutral',
  rejected: 'danger',
};

export default function ResumeAdapt() {
  const { t } = useTranslation();
  const { jobId = '' } = useParams();
  const [versionId, setVersionId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<FieldReview[]>([]);
  const [busy, setBusy] = useState<'generate' | 'fix' | 'save' | null>(null);

  const context = useAsync(async () => {
    const [template, guide, job, versions] = await Promise.all([
      loadTemplate(),
      loadStyleGuide(),
      supabase.from('jm_jobs').select('title, company').eq('id', jobId).maybeSingle(),
      supabase
        .from('jm_resume_versions')
        .select('id, job_id, base_fields, review, final_fields, model, status, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false }),
    ]);
    if (versions.error) throw new Error(versions.error.message);
    return {
      template,
      banned: guide.bannedPhrases,
      job: job.data as { title: string; company: string } | null,
      versions: (versions.data ?? []) as ResumeVersionRow[],
    };
  }, [jobId]);

  const versions = context.data?.versions ?? [];
  const current = versions.find((version) => version.id === versionId) ?? versions[0] ?? null;
  const banned = context.data?.banned ?? [];
  const structure = context.data?.template?.structure;

  useEffect(() => {
    if (current) {
      setVersionId(current.id);
      setReviews(current.review);
    }
  }, [current?.id]);

  const stats = useMemo(() => {
    const changed = reviews.filter((review) => review.status === 'changed').length;
    const rejected = reviews.filter((review) => review.status === 'rejected').length;
    const accepted = reviews.filter(
      (review) => review.accepted && review.status !== 'rejected',
    ).length;
    const flagged = reviews.filter(
      (review) => review.accepted && findBannedPhrases(review.proposed, banned).length > 0,
    ).length;
    return { changed, rejected, accepted, flagged };
  }, [reviews, banned]);

  function update(key: string, patch: Partial<FieldReview>) {
    setReviews((list) =>
      list.map((review) => (review.key === key ? { ...review, ...patch } : review)),
    );
  }

  async function generate() {
    setBusy('generate');
    const id = toast.loading(t('adapt.generating'));
    const { data, error } = await callFunction<{
      versionId: string;
      extraKeys: string[];
      missingKeys: string[];
    }>('ai', { action: 'adapt-resume', jobId });
    setBusy(null);
    if (error || !data) {
      toast.error(t('adapt.failed'), { id, description: error ?? undefined });
      return;
    }
    const notes = [
      data.extraKeys.length ? t('adapt.extraKeys', { count: data.extraKeys.length }) : '',
      data.missingKeys.length ? t('adapt.missingKeys', { count: data.missingKeys.length }) : '',
    ].filter(Boolean);
    toast.success(t('adapt.generated'), { id, description: notes.join(' ') || undefined });
    setVersionId(data.versionId);
    context.reload();
  }

  async function fixBanned() {
    const targets = reviews.filter(
      (review) => review.accepted && findBannedPhrases(review.proposed, banned).length > 0,
    );
    const sentences = targets.flatMap((review) =>
      sentencesWithBannedPhrases(review.proposed, banned),
    );
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
    const replacements = new Map(
      sentences.map((sentence, index) => [sentence, data.sentences[index] ?? sentence]),
    );
    setReviews((list) =>
      list.map((review) => {
        if (!targets.some((target) => target.key === review.key)) return review;
        let text = review.proposed;
        for (const [from, to] of replacements) text = text.replace(from, to);
        return { ...review, proposed: replaceDashes(text) };
      }),
    );
    toast.success(t('adapt.fixed', { count: sentences.length }), { id });
  }

  async function save(): Promise<boolean> {
    if (!current) return false;
    setBusy('save');
    const final = finalFields(current.base_fields, reviews);
    const { error } = await supabase
      .from('jm_resume_versions')
      .update({ review: reviews, final_fields: final, status: 'final' })
      .eq('id', current.id);
    setBusy(null);
    if (error) {
      toast.error(t('adapt.saveFailed'), { description: error.message });
      return false;
    }
    toast.success(t('adapt.saved'));
    return true;
  }

  async function exportPdf() {
    if (await save()) window.open(`/print/resume/${current?.id}`, '_blank', 'noopener');
  }

  if (context.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  const header = (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to={`/app/jobs/${jobId}`}>
          <ArrowLeft />
          {t('adapt.backToJob')}
        </Link>
      </Button>
      <PageHeader
        title={t('adapt.title')}
        description={
          context.data?.job ? `${context.data.job.title} · ${context.data.job.company}` : undefined
        }
        actions={
          <Button
            onClick={() => void generate()}
            disabled={busy !== null || !context.data?.template}
          >
            {busy === 'generate' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {current ? t('adapt.regenerate') : t('adapt.generate')}
          </Button>
        }
      />
    </>
  );

  if (!context.data?.template) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Sparkles}
          title={t('adapt.noTemplate')}
          description={t('adapt.noTemplateText')}
          action={
            <Button asChild size="sm">
              <Link to="/app/resume">{t('nav.resume')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState
          icon={Sparkles}
          title={t('adapt.emptyTitle')}
          description={t('adapt.emptyText')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {header}

      <Card className="gap-4 p-5">
        <div className="flex flex-wrap items-center gap-3">
          {versions.length > 1 && (
            <Select value={current.id} onValueChange={setVersionId}>
              <SelectTrigger className="w-full sm:w-64" aria-label={t('adapt.version')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {new Date(version.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {version.status === 'final' ? ` · ${t('adapt.final')}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <StatusBadge tone="primary">
            {t('adapt.statChanged', { count: stats.changed })}
          </StatusBadge>
          <StatusBadge tone="success">
            {t('adapt.statAccepted', { count: stats.accepted })}
          </StatusBadge>
          {stats.rejected > 0 && (
            <StatusBadge tone="danger">
              {t('adapt.statRejected', { count: stats.rejected })}
            </StatusBadge>
          )}
          {stats.flagged > 0 && (
            <StatusBadge tone="warning">
              {t('adapt.statFlagged', { count: stats.flagged })}
            </StatusBadge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setReviews((list) =>
                list.map((review) => ({ ...review, accepted: review.status === 'changed' })),
              )
            }
          >
            <Check />
            {t('adapt.acceptAll')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setReviews((list) => list.map((review) => ({ ...review, accepted: false })))
            }
          >
            <X />
            {t('adapt.rejectAll')}
          </Button>
          {stats.flagged > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              onClick={() => void fixBanned()}
            >
              {busy === 'fix' ? <Loader2 className="animate-spin" /> : <Wand2 />}
              {t('adapt.fixBanned')}
            </Button>
          )}
        </div>
      </Card>

      <ul className="space-y-3">
        {reviews.map((review) => {
          const hits = findBannedPhrases(review.proposed, banned);
          const rejected = review.status === 'rejected';
          return (
            <li key={review.key}>
              <Card className="gap-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {structure ? fieldLabel(review.key, structure) : review.key}
                    </span>
                    <StatusBadge tone={STATUS_TONE[review.status]}>
                      {t(`adapt.status.${review.status}`)}
                    </StatusBadge>
                    {hits.length > 0 && (
                      <StatusBadge tone="warning">
                        {t('adapt.bannedCount', { count: hits.length })}
                      </StatusBadge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`accept-${review.key}`}
                      className="text-xs font-normal text-muted-foreground"
                    >
                      {t('adapt.useProposal')}
                    </Label>
                    <Switch
                      id={`accept-${review.key}`}
                      checked={review.accepted && !rejected}
                      disabled={rejected || review.status === 'unchanged'}
                      onCheckedChange={(value) => update(review.key, { accepted: value })}
                    />
                  </div>
                </div>
                {rejected && review.reasons.length > 0 && (
                  <p className="text-xs text-destructive">
                    {t('adapt.rejectedBecause', { reasons: review.reasons.join('; ') })}
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t('adapt.before')}
                    </p>
                    <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed text-muted-foreground">
                      {review.original}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {t('adapt.after')}
                    </p>
                    {rejected || review.status === 'unchanged' ? (
                      <p className="rounded-lg border border-dashed p-3 text-sm leading-relaxed">
                        <HighlightedText text={review.proposed} banned={banned} />
                      </p>
                    ) : (
                      <>
                        <Textarea
                          value={review.proposed}
                          onChange={(e) => update(review.key, { proposed: e.target.value })}
                          onBlur={(e) =>
                            update(review.key, { proposed: replaceDashes(e.target.value) })
                          }
                          className="min-h-20 text-sm leading-relaxed"
                          aria-label={t('adapt.after')}
                        />
                        {hits.length > 0 && (
                          <p className="rounded-lg bg-warning/10 p-2 text-xs leading-relaxed">
                            <HighlightedText text={review.proposed} banned={banned} />
                          </p>
                        )}
                        <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                          {review.proposed.length}/{Math.ceil(review.original.length * 1.15)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border">
        <div className="grid gap-2 sm:flex sm:items-center sm:justify-end">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            {t('adapt.saveHint')}
          </p>
          <Button variant="outline" onClick={() => void save()} disabled={busy !== null}>
            {busy === 'save' ? <Loader2 className="animate-spin" /> : <Save />}
            {t('adapt.save')}
          </Button>
          <Button onClick={() => void exportPdf()} disabled={busy !== null}>
            <FileDown />
            {t('adapt.pdf')}
          </Button>
        </div>
      </div>
    </div>
  );
}
