import { FileUp, Loader2, Save, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FormField } from '@/components/app/FormField';
import { PageHeader } from '@/components/app/PageHeader';
import { TagInput } from '@/components/app/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { extractPdfText } from '@/lib/pdf';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';
import { cn } from '@/lib/utils';

const MODES = ['remote', 'hybrid', 'onsite'] as const;
const LEVELS = ['none', 'intern', 'junior', 'mid', 'senior', 'lead'] as const;

interface ProfileForm {
  cv: string;
  skills: string[];
  seniority: string;
  location: string;
  modes: string[];
  must: string[];
  exclude: string[];
  ignored: string[];
}

interface Extracted {
  skills: string[];
  seniority: string | null;
  location: string | null;
  work_modes: string[];
  keywords: string[];
  headline: string;
}

const EMPTY: ProfileForm = {
  cv: '',
  skills: [],
  seniority: '',
  location: '',
  modes: [],
  must: [],
  exclude: [],
  ignored: [],
};

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 py-6">{children}</CardContent>
    </Card>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'ai' | null>(null);
  const [aiFilled, setAiFilled] = useState<Set<keyof ProfileForm>>(new Set());

  const loaded = useAsync(async () => {
    const { data, error } = await supabase
      .from('jm_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }, [userId]);

  useEffect(() => {
    const row = loaded.data;
    if (!row) return;
    setForm({
      cv: row.cv_text ?? '',
      skills: row.skills ?? [],
      seniority: row.seniority ?? '',
      location: row.location ?? '',
      modes: row.work_modes ?? [],
      must: row.must_keywords ?? [],
      exclude: row.exclude_keywords ?? [],
      ignored: row.ignored_companies ?? [],
    });
  }, [loaded.data]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setAiFilled((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  };

  async function fillWithAi(cvText: string) {
    setBusy('ai');
    const id = toast.loading(t('profile.aiReading'));
    const { data, error } = await callFunction<{ profile: Extracted }>('parse-cv', { cvText });
    setBusy(null);
    if (error || !data) {
      toast.error(t('profile.aiFailed'), { id, description: error ?? undefined });
      return;
    }
    const extracted = data.profile;
    const level =
      extracted.seniority && (LEVELS as readonly string[]).includes(extracted.seniority)
        ? extracted.seniority
        : '';
    setForm((f) => ({
      ...f,
      skills: extracted.skills.length > 0 ? extracted.skills : f.skills,
      seniority: level || f.seniority,
      location: extracted.location ?? f.location,
      modes: extracted.work_modes.length > 0 ? extracted.work_modes : f.modes,
      must: extracted.keywords.length > 0 ? extracted.keywords : f.must,
    }));
    setAiFilled(new Set<keyof ProfileForm>(['skills', 'seniority', 'location', 'modes', 'must']));
    toast.success(t('profile.aiDone'), {
      id,
      description: extracted.headline || t('profile.aiReview'),
    });
  }

  async function onPdf(file: File | undefined) {
    if (!file) return;
    setBusy('pdf');
    try {
      const text = await extractPdfText(file);
      setForm((f) => ({ ...f, cv: text }));
      toast.success(t('profile.pdfRead', { name: file.name }));
      setBusy(null);
      if (text.trim().length >= 80) await fillWithAi(text);
    } catch {
      setBusy(null);
      toast.error(t('profile.pdfError'));
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('jm_profiles').upsert({
      user_id: userId,
      cv_text: form.cv,
      skills: form.skills,
      seniority: form.seniority || null,
      location: form.location.trim() || null,
      work_modes: form.modes,
      must_keywords: form.must,
      exclude_keywords: form.exclude,
      ignored_companies: form.ignored,
    });
    setSaving(false);
    if (error) toast.error(t('profile.saveError'), { description: error.message });
    else {
      setAiFilled(new Set());
      toast.success(t('profile.saved'));
    }
  }

  const aiMark = (key: keyof ProfileForm) =>
    aiFilled.has(key) ? (
      <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-600 dark:text-primary">
        <Sparkles className="size-3" />
        IA
      </span>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <PageHeader title={t('profile.title')} description={t('profile.description')} />

      {loaded.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {loaded.error}
        </p>
      )}

      {loaded.loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="space-y-4 rounded-xl border p-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <SectionCard
            title={t('profile.cvTitle')}
            description={t('profile.cvHint')}
            action={
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => void onPdf(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => void fillWithAi(form.cv)}
                  className={cn(form.cv.trim().length < 80 && 'hidden')}
                >
                  {busy === 'ai' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {t('profile.fillWithAi')}
                </Button>
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => fileInput.current?.click()}
                >
                  {busy === 'pdf' ? <Loader2 className="animate-spin" /> : <FileUp />}
                  {busy === 'pdf' ? t('profile.extracting') : t('profile.uploadPdf')}
                </Button>
              </div>
            }
          >
            <Textarea
              rows={12}
              value={form.cv}
              onChange={(e) => set('cv', e.target.value)}
              aria-label={t('profile.cv')}
              placeholder={t('profile.cvPlaceholder')}
              className="min-h-64 font-mono text-xs leading-relaxed"
            />
            <p className="text-xs text-muted-foreground">{t('profile.privacy')}</p>
          </SectionCard>

          <SectionCard title={t('profile.aboutTitle')} description={t('profile.aboutDescription')}>
            <FormField
              label={
                <>
                  {t('profile.skills')}
                  {aiMark('skills')}
                </>
              }
              description={t('profile.tagHint')}
            >
              <TagInput
                value={form.skills}
                onChange={(next) => set('skills', next)}
                placeholder="TypeScript, React…"
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label={
                  <>
                    {t('profile.seniority')}
                    {aiMark('seniority')}
                  </>
                }
              >
                <Select
                  value={form.seniority || 'none'}
                  onValueChange={(value) => set('seniority', value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {t(`profile.levels.${level}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label={
                  <>
                    {t('profile.location')}
                    {aiMark('location')}
                  </>
                }
              >
                <Input
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="Porto, Portugal"
                />
              </FormField>
            </div>
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium">
                {t('profile.workMode')}
                {aiMark('modes')}
              </legend>
              <div className="flex flex-wrap gap-2">
                {MODES.map((mode) => {
                  const active = form.modes.includes(mode);
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      onClick={() =>
                        set(
                          'modes',
                          active ? form.modes.filter((m) => m !== mode) : [...form.modes, mode],
                        )
                      }
                      className={cn(
                        'rounded-full border px-4 py-1.5 text-sm transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {t(`profile.modes.${mode}`)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </SectionCard>

          <SectionCard title={t('profile.rulesTitle')} description={t('profile.rulesDescription')}>
            <FormField
              label={
                <>
                  {t('profile.must')}
                  {aiMark('must')}
                </>
              }
              description={t('profile.mustHint')}
            >
              <TagInput
                value={form.must}
                onChange={(next) => set('must', next)}
                tone="success"
                placeholder="frontend, react…"
              />
            </FormField>
            <FormField label={t('profile.exclude')} description={t('profile.excludeHint')}>
              <TagInput
                value={form.exclude}
                onChange={(next) => set('exclude', next)}
                tone="danger"
                placeholder="php, estágio…"
              />
            </FormField>
            <FormField label={t('profile.ignored')} description={t('profile.ignoredHint')}>
              <TagInput
                value={form.ignored}
                onChange={(next) => set('ignored', next)}
                tone="danger"
                placeholder="Empresa X…"
              />
            </FormField>
          </SectionCard>
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {aiFilled.size > 0 ? t('profile.aiReview') : t('profile.saveHint')}
          </p>
          <Button type="submit" disabled={saving || loaded.loading} className="w-full sm:w-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? t('ui.saving') : t('profile.save')}
          </Button>
        </div>
      </div>
    </form>
  );
}
