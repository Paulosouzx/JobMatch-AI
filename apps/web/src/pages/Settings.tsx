import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Field, Input, Select, Spinner, Textarea } from '../components/ui';
import { useAuth } from '../lib/auth';
import { formatList, parseList } from '../lib/lists';
import { supabase } from '../lib/supabase';
import { useAsync } from '../lib/useAsync';

type SecretKind = 'llm' | 'telegram' | 'adzuna' | 'itjobs';

const PROVIDERS = ['gemini', 'groq', 'openrouter', 'ollama'] as const;
const DEFAULT_MODELS: Record<(typeof PROVIDERS)[number], string> = {
  gemini: 'gemini-2.5-flash',
  groq: 'llama-3.3-70b-versatile',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  ollama: 'llama3.1',
};
const FREE_SOURCES = ['remotive', 'arbeitnow', 'remoteok'] as const;

interface SettingsForm {
  provider: (typeof PROVIDERS)[number];
  model: string;
  baseUrl: string;
  chatId: string;
  adzunaAppId: string;
  minScore: number;
  dailyLimit: number;
  frequency: number;
  concurrency: number;
}

interface SourcesForm {
  enabled: Record<string, boolean>;
  greenhouse: string;
  lever: string;
  adzunaCountry: string;
  adzunaQuery: string;
  itjobsQuery: string;
}

const EMPTY_SETTINGS: SettingsForm = {
  provider: 'gemini',
  model: '',
  baseUrl: '',
  chatId: '',
  adzunaAppId: '',
  minScore: 70,
  dailyLimit: 100,
  frequency: 2,
  concurrency: 2,
};

const EMPTY_SOURCES: SourcesForm = {
  enabled: {
    remotive: true,
    arbeitnow: true,
    remoteok: true,
    greenhouse: true,
    lever: true,
    adzuna: true,
    itjobs: true,
  },
  greenhouse: '',
  lever: '',
  adzunaCountry: 'pt',
  adzunaQuery: '',
  itjobsQuery: '',
};

function SecretField({
  label,
  kind,
  last4,
  onChanged,
  helpText,
}: {
  label: string;
  kind: SecretKind;
  last4: string | null;
  onChanged: () => void;
  helpText?: string;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const { data, error: failure } = await supabase.functions.invoke('save-secret', { body });
    setBusy(false);
    if (failure || (data && typeof data === 'object' && 'error' in data)) {
      setError(t('common.error'));
      return false;
    }
    return true;
  }

  async function save() {
    if (await call({ kind, action: 'set', value })) {
      setValue('');
      setEditing(false);
      onChanged();
    }
  }

  async function remove() {
    if (await call({ kind, action: 'delete' })) onChanged();
  }

  const showInput = editing || last4 === null;

  return (
    <div className="space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {showInput ? (
        <div className="flex gap-2">
          <Input
            type="password"
            autoComplete="off"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={label}
          />
          <Button
            type="button"
            disabled={busy || value.trim().length < 4}
            onClick={() => void save()}
          >
            {t('common.save')}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
            ••••{last4}
          </code>
          <Button type="button" variant="secondary" onClick={() => setEditing(true)}>
            {t('common.replace')}
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()}>
            {t('common.remove')}
          </Button>
        </div>
      )}
      {helpText && <p className="text-xs text-slate-500">{helpText}</p>}
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const [form, setForm] = useState<SettingsForm>(EMPTY_SETTINGS);
  const [sources, setSources] = useState<SourcesForm>(EMPTY_SOURCES);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [testing, setTesting] = useState<'llm' | 'telegram' | null>(null);

  const loaded = useAsync(async () => {
    const [settings, sourceRows] = await Promise.all([
      supabase.from('jm_settings').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('jm_sources').select('type, enabled, config'),
    ]);
    const failure = settings.error ?? sourceRows.error;
    if (failure) throw new Error(failure.message);
    return { settings: settings.data, sources: sourceRows.data ?? [] };
  }, [userId]);

  const secrets = useAsync(async () => {
    const { data, error } = await supabase.from('jm_user_secrets').select('kind, last4');
    if (error) throw new Error(error.message);
    return data ?? [];
  }, [userId]);

  useEffect(() => {
    if (!loaded.data) return;
    const row = loaded.data.settings;
    if (row) {
      setForm({
        provider: row.llm_provider,
        model: row.llm_model ?? '',
        baseUrl: row.llm_base_url ?? '',
        chatId: row.telegram_chat_id ?? '',
        adzunaAppId: row.adzuna_app_id ?? '',
        minScore: row.min_score,
        dailyLimit: row.daily_llm_limit,
        frequency: row.frequency_hours,
        concurrency: row.llm_concurrency,
      });
    }
    const next: SourcesForm = { ...EMPTY_SOURCES, enabled: { ...EMPTY_SOURCES.enabled } };
    for (const source of loaded.data.sources) {
      next.enabled[source.type] = source.enabled;
      const config = (source.config ?? {}) as Record<string, unknown>;
      if (source.type === 'greenhouse')
        next.greenhouse = formatList(asStrings(config.companies), '\n');
      if (source.type === 'lever') next.lever = formatList(asStrings(config.companies), '\n');
      if (source.type === 'adzuna') {
        next.adzunaCountry = typeof config.country === 'string' ? config.country : 'pt';
        next.adzunaQuery = typeof config.what === 'string' ? config.what : '';
      }
      if (source.type === 'itjobs')
        next.itjobsQuery = typeof config.query === 'string' ? config.query : '';
    }
    setSources(next);
  }, [loaded.data]);

  const last4 = (kind: SecretKind): string | null =>
    secrets.data?.find((secret) => secret.kind === kind)?.last4 ?? null;

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function persist(): Promise<boolean> {
    const settingsResult = await supabase
      .from('jm_settings')
      .update({
        llm_provider: form.provider,
        llm_model: form.model.trim() || null,
        llm_base_url: form.baseUrl.trim() || null,
        telegram_chat_id: form.chatId.trim() || null,
        adzuna_app_id: form.adzunaAppId.trim() || null,
        min_score: form.minScore,
        daily_llm_limit: form.dailyLimit,
        frequency_hours: form.frequency,
        llm_concurrency: form.concurrency,
      })
      .eq('user_id', userId);
    if (settingsResult.error) {
      setMessage({ kind: 'error', text: settingsResult.error.message });
      return false;
    }
    const rows = [
      ...['remotive', 'arbeitnow', 'remoteok'].map((type) => ({ type, config: {} })),
      { type: 'greenhouse', config: { companies: parseList(sources.greenhouse) } },
      { type: 'lever', config: { companies: parseList(sources.lever) } },
      {
        type: 'adzuna',
        config: { country: sources.adzunaCountry.trim() || 'pt', what: sources.adzunaQuery.trim() },
      },
      { type: 'itjobs', config: { query: sources.itjobsQuery.trim() } },
    ].map((row) => ({ user_id: userId, enabled: sources.enabled[row.type] ?? true, ...row }));
    const sourcesResult = await supabase
      .from('jm_sources')
      .upsert(rows, { onConflict: 'user_id,type' });
    if (sourcesResult.error) {
      setMessage({ kind: 'error', text: sourcesResult.error.message });
      return false;
    }
    return true;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const ok = await persist();
    setSaving(false);
    if (ok) setMessage({ kind: 'success', text: t('common.saved') });
  }

  async function runTest(target: 'llm' | 'telegram') {
    setTesting(target);
    setMessage(null);
    if (await persist()) {
      const { data, error } = await supabase.functions.invoke('test-connection', {
        body: { target },
      });
      if (error || !data) setMessage({ kind: 'error', text: t('common.error') });
      else setMessage({ kind: data.ok ? 'success' : 'error', text: String(data.message) });
    }
    setTesting(null);
  }

  if (loaded.loading) return <Spinner label={t('common.loading')} />;

  const isOllama = form.provider === 'ollama';

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      {loaded.error && <Alert>{loaded.error}</Alert>}

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('settings.llmTitle')}</h2>
        <Alert kind="info">{t('settings.privacyNote')}</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.provider')}>
            <Select
              value={form.provider}
              onChange={(e) => set('provider', e.target.value as SettingsForm['provider'])}
            >
              {PROVIDERS.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t('settings.model')}
            hint={`${t('settings.modelHint')}: ${DEFAULT_MODELS[form.provider]}`}
          >
            <Input
              value={form.model}
              onChange={(e) => set('model', e.target.value)}
              placeholder={DEFAULT_MODELS[form.provider]}
            />
          </Field>
        </div>
        {isOllama ? (
          <Field label={t('settings.baseUrl')}>
            <Input
              value={form.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
              placeholder="http://localhost:11434"
            />
          </Field>
        ) : (
          <SecretField
            label={t('settings.apiKey')}
            kind="llm"
            last4={last4('llm')}
            onChanged={secrets.reload}
            helpText={t('settings.secretHelp')}
          />
        )}
        <Button
          type="button"
          variant="secondary"
          disabled={testing !== null}
          onClick={() => void runTest('llm')}
        >
          {testing === 'llm' ? t('settings.testing') : t('settings.testConnection')}
        </Button>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('settings.integrationsTitle')}</h2>
        <SecretField
          label={t('settings.telegramToken')}
          kind="telegram"
          last4={last4('telegram')}
          onChanged={secrets.reload}
        />
        <Field label={t('settings.telegramChatId')}>
          <Input
            value={form.chatId}
            onChange={(e) => set('chatId', e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={testing !== null}
          onClick={() => void runTest('telegram')}
        >
          {testing === 'telegram' ? t('settings.testing') : t('settings.telegramTest')}
        </Button>
        <hr className="border-slate-200 dark:border-slate-800" />
        <Field label={`${t('settings.adzunaAppId')} (${t('settings.optional')})`}>
          <Input value={form.adzunaAppId} onChange={(e) => set('adzunaAppId', e.target.value)} />
        </Field>
        <SecretField
          label={`${t('settings.adzunaKey')} (${t('settings.optional')})`}
          kind="adzuna"
          last4={last4('adzuna')}
          onChanged={secrets.reload}
        />
        <SecretField
          label={`${t('settings.itjobsKey')} (${t('settings.optional')})`}
          kind="itjobs"
          last4={last4('itjobs')}
          onChanged={secrets.reload}
        />
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('settings.sourcesTitle')}</h2>
        <p className="text-sm text-slate-500">{t('settings.sourcesHint')}</p>
        <div className="flex flex-wrap gap-4">
          {[...FREE_SOURCES, 'greenhouse', 'lever', 'adzuna', 'itjobs'].map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sources.enabled[type] ?? true}
                onChange={(e) =>
                  setSources((s) => ({ ...s, enabled: { ...s.enabled, [type]: e.target.checked } }))
                }
              />
              {type}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.greenhouseCompanies')}>
            <Textarea
              rows={3}
              value={sources.greenhouse}
              onChange={(e) => setSources((s) => ({ ...s, greenhouse: e.target.value }))}
            />
          </Field>
          <Field label={t('settings.leverCompanies')}>
            <Textarea
              rows={3}
              value={sources.lever}
              onChange={(e) => setSources((s) => ({ ...s, lever: e.target.value }))}
            />
          </Field>
          <Field label={t('settings.adzunaCountry')}>
            <Input
              value={sources.adzunaCountry}
              onChange={(e) => setSources((s) => ({ ...s, adzunaCountry: e.target.value }))}
            />
          </Field>
          <Field label={t('settings.adzunaQuery')}>
            <Input
              value={sources.adzunaQuery}
              onChange={(e) => setSources((s) => ({ ...s, adzunaQuery: e.target.value }))}
            />
          </Field>
          <Field label={t('settings.itjobsQuery')}>
            <Input
              value={sources.itjobsQuery}
              onChange={(e) => setSources((s) => ({ ...s, itjobsQuery: e.target.value }))}
            />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t('settings.matchingTitle')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('settings.minScore')}>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.minScore}
              onChange={(e) => set('minScore', clamp(e.target.value, 0, 100))}
            />
          </Field>
          <Field label={t('settings.dailyLimit')}>
            <Input
              type="number"
              min={0}
              value={form.dailyLimit}
              onChange={(e) => set('dailyLimit', clamp(e.target.value, 0, 100000))}
            />
          </Field>
          <Field label={t('settings.frequency')}>
            <Input
              type="number"
              min={1}
              max={168}
              value={form.frequency}
              onChange={(e) => set('frequency', clamp(e.target.value, 1, 168))}
            />
          </Field>
          <Field label={t('settings.concurrency')}>
            <Input
              type="number"
              min={1}
              max={10}
              value={form.concurrency}
              onChange={(e) => set('concurrency', clamp(e.target.value, 1, 10))}
            />
          </Field>
        </div>
      </Card>

      {message && <Alert kind={message.kind}>{message.text}</Alert>}
      <Button type="submit" disabled={saving}>
        {t('common.save')}
      </Button>
    </form>
  );
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function clamp(raw: string, min: number, max: number): number {
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
