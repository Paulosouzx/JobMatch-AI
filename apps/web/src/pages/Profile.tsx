import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from '../components/legacy-ui';
import { useAuth } from '../lib/auth';
import { formatList, parseList } from '../lib/lists';
import { extractPdfText } from '../lib/pdf';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

const MODES = ['remote', 'hybrid', 'onsite'] as const;
const LEVELS = ['', 'intern', 'junior', 'mid', 'senior', 'lead'] as const;

interface ProfileForm {
  cv: string;
  skills: string;
  seniority: string;
  location: string;
  modes: string[];
  must: string;
  exclude: string;
  ignored: string;
}

const EMPTY: ProfileForm = {
  cv: '',
  skills: '',
  seniority: '',
  location: '',
  modes: [],
  must: '',
  exclude: '',
  ignored: '',
};

export default function Profile() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const fileInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

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
      skills: formatList(row.skills ?? []),
      seniority: row.seniority ?? '',
      location: row.location ?? '',
      modes: row.work_modes ?? [],
      must: formatList(row.must_keywords ?? []),
      exclude: formatList(row.exclude_keywords ?? []),
      ignored: formatList(row.ignored_companies ?? []),
    });
  }, [loaded.data]);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onPdf(file: File | undefined) {
    if (!file) return;
    setExtracting(true);
    setMessage(null);
    try {
      set('cv', await extractPdfText(file));
    } catch {
      setMessage({ kind: 'error', text: t('profile.pdfError') });
    } finally {
      setExtracting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await supabase.from('jm_profiles').upsert({
      user_id: userId,
      cv_text: form.cv,
      skills: parseList(form.skills),
      seniority: form.seniority || null,
      location: form.location.trim() || null,
      work_modes: form.modes,
      must_keywords: parseList(form.must),
      exclude_keywords: parseList(form.exclude),
      ignored_companies: parseList(form.ignored),
    });
    setSaving(false);
    setMessage(
      error ? { kind: 'error', text: error.message } : { kind: 'success', text: t('common.saved') },
    );
  }

  if (loaded.loading) return <Spinner label={t('common.loading')} />;

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
      {loaded.error && <Alert>{loaded.error}</Alert>}

      <Card className="space-y-4">
        <Field label={t('profile.cv')} hint={t('profile.cvHint')}>
          <Textarea rows={12} value={form.cv} onChange={(e) => set('cv', e.target.value)} />
        </Field>
        <div className="flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => void onPdf(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={extracting}
            onClick={() => fileInput.current?.click()}
          >
            {extracting ? t('profile.extracting') : t('profile.uploadPdf')}
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <Field label={t('profile.skills')}>
          <Textarea rows={2} value={form.skills} onChange={(e) => set('skills', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('profile.seniority')}>
            <Select value={form.seniority} onChange={(e) => set('seniority', e.target.value)}>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`profile.levels.${level}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('profile.location')}>
            <Input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="Porto, Portugal"
            />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">{t('profile.workMode')}</legend>
          <div className="flex flex-wrap gap-4">
            {MODES.map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.modes.includes(mode)}
                  onChange={(e) =>
                    set(
                      'modes',
                      e.target.checked
                        ? [...form.modes, mode]
                        : form.modes.filter((m) => m !== mode),
                    )
                  }
                />
                {t(`profile.modes.${mode}`)}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="space-y-4">
        <Field label={t('profile.must')} hint={t('profile.listHint')}>
          <Textarea rows={2} value={form.must} onChange={(e) => set('must', e.target.value)} />
        </Field>
        <Field label={t('profile.exclude')} hint={t('profile.listHint')}>
          <Textarea
            rows={2}
            value={form.exclude}
            onChange={(e) => set('exclude', e.target.value)}
          />
        </Field>
        <Field label={t('profile.ignored')} hint={t('profile.listHint')}>
          <Textarea
            rows={2}
            value={form.ignored}
            onChange={(e) => set('ignored', e.target.value)}
          />
        </Field>
      </Card>

      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <Button type="submit" disabled={saving}>
        {t('common.save')}
      </Button>
    </form>
  );
}
