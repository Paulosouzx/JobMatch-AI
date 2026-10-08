import {
  CircleCheck,
  KeyRound,
  ListFilter,
  Loader2,
  PlugZap,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/app/ConfirmDialog';
import { FormField } from '@/components/app/FormField';
import { PageHeader } from '@/components/app/PageHeader';
import { InstallAppCard } from '@/components/InstallAppCard';
import { PushSettings } from '@/components/PushSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { callFunction } from '@/lib/functions';
import { formatList, parseList } from '@/lib/lists';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

type SecretKind = 'llm' | 'adzuna' | 'itjobs';

const PROVIDERS = ['gemini', 'groq', 'openrouter', 'ollama'] as const;
const DEFAULT_MODELS: Record<(typeof PROVIDERS)[number], string> = {
  gemini: 'gemini-2.5-flash',
  groq: 'openai/gpt-oss-120b',
  openrouter: 'meta-llama/llama-3.3-70b-instruct:free',
  ollama: 'llama3.1',
};
const SOURCE_TYPES = [
  'remotive',
  'arbeitnow',
  'remoteok',
  'netempregos',
  'linkedin',
  'greenhouse',
  'lever',
  'adzuna',
  'itjobs',
] as const;

interface SettingsForm {
  provider: (typeof PROVIDERS)[number];
  model: string;
  baseUrl: string;
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
  netempregos: string;
  linkedinSearches: string;
  linkedinLocation: string;
  linkedinRemoteOnly: boolean;
  adzunaCountry: string;
  adzunaQuery: string;
  itjobsQuery: string;
}

const EMPTY_SETTINGS: SettingsForm = {
  provider: 'gemini',
  model: '',
  baseUrl: '',
  adzunaAppId: '',
  minScore: 70,
  dailyLimit: 100,
  frequency: 2,
  concurrency: 2,
};

const EMPTY_SOURCES: SourcesForm = {
  enabled: Object.fromEntries(SOURCE_TYPES.map((type) => [type, type !== 'linkedin'])),
  greenhouse: '',
  lever: '',
  netempregos: '',
  linkedinSearches: '',
  linkedinLocation: 'Portugal',
  linkedinRemoteOnly: false,
  adzunaCountry: 'pt',
  adzunaQuery: '',
  itjobsQuery: '',
};

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function clamp(raw: string, min: number, max: number): number {
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5 py-6">{children}</CardContent>
    </Card>
  );
}

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

  async function save() {
    setBusy(true);
    const { error } = await callFunction('save-secret', { kind, action: 'set', value });
    setBusy(false);
    if (error) {
      toast.error(t('settings.secretSaveError'), { description: error });
      return;
    }
    toast.success(t('settings.secretSaved', { label }));
    setValue('');
    setEditing(false);
    onChanged();
  }

  async function remove() {
    const { error } = await callFunction('save-secret', { kind, action: 'delete' });
    if (error) {
      toast.error(t('settings.secretRemoveError'), { description: error });
      return;
    }
    toast.success(t('settings.secretRemoved', { label }));
    onChanged();
  }

  const showInput = editing || last4 === null;

  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {showInput ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <KeyRound
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="password"
              autoComplete="off"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-label={label}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="success"
              disabled={busy || value.trim().length < 4}
              onClick={() => void save()}
            >
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              {t('settings.addKey')}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-9 w-full items-center gap-2 rounded-md border bg-muted/50 px-3 font-mono text-sm sm:w-auto">
            <CircleCheck className="size-4 text-success" aria-hidden="true" />
            ••••{last4}
          </span>
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            onClick={() => setEditing(true)}
          >
            {t('common.replace')}
          </Button>
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive-outline" className="flex-1 sm:flex-none">
                <Trash2 />
                {t('common.remove')}
              </Button>
            }
            title={t('settings.removeKeyTitle', { label })}
            description={t('settings.removeKeyText')}
            confirmLabel={t('common.remove')}
            cancelLabel={t('common.cancel')}
            onConfirm={remove}
          />
        </div>
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="space-y-4 rounded-xl border p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
        </div>
      ))}
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
  const [testing, setTesting] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [advanced, setAdvanced] = useState(() => {
    try {
      return localStorage.getItem('settings.advanced') === '1';
    } catch {
      return false;
    }
  });

  function toggleAdvanced(value: boolean) {
    setAdvanced(value);
    try {
      localStorage.setItem('settings.advanced', value ? '1' : '0');
    } catch {
      return;
    }
  }
  const [loadingModels, setLoadingModels] = useState(false);

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
      if (source.type === 'linkedin') {
        next.linkedinSearches = formatList(asStrings(config.searches), '\n');
        next.linkedinLocation = typeof config.location === 'string' ? config.location : 'Portugal';
        next.linkedinRemoteOnly = config.remoteOnly === true;
      }
      if (source.type === 'netempregos')
        next.netempregos = formatList(asStrings(config.categories), '\n');
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

  async function persist(): Promise<string | null> {
    if (!(PROVIDERS as readonly string[]).includes(form.provider))
      return t('settings.invalidProvider');
    const settingsResult = await supabase
      .from('jm_settings')
      .update({
        llm_provider: form.provider,
        llm_model: form.model.trim() || DEFAULT_MODELS[form.provider],
        llm_base_url: form.baseUrl.trim() || null,
        adzuna_app_id: form.adzunaAppId.trim() || null,
        min_score: form.minScore,
        daily_llm_limit: form.dailyLimit,
        frequency_hours: form.frequency,
        llm_concurrency: form.concurrency,
      })
      .eq('user_id', userId);
    if (settingsResult.error) return settingsResult.error.message;
    const rows = [
      ...['remotive', 'arbeitnow', 'remoteok'].map((type) => ({ type, config: {} })),
      { type: 'netempregos', config: { categories: parseList(sources.netempregos) } },
      {
        type: 'linkedin',
        config: {
          searches: parseList(sources.linkedinSearches).slice(0, 3),
          location: sources.linkedinLocation.trim() || 'Portugal',
          remoteOnly: sources.linkedinRemoteOnly,
        },
      },
      { type: 'greenhouse', config: { companies: parseList(sources.greenhouse) } },
      { type: 'lever', config: { companies: parseList(sources.lever) } },
      {
        type: 'adzuna',
        config: { country: sources.adzunaCountry.trim() || 'pt', what: sources.adzunaQuery.trim() },
      },
      { type: 'itjobs', config: { query: sources.itjobsQuery.trim() } },
    ].map((row) => ({
      user_id: userId,
      enabled: sources.enabled[row.type] ?? row.type !== 'linkedin',
      ...row,
    }));
    const sourcesResult = await supabase
      .from('jm_sources')
      .upsert(rows, { onConflict: 'user_id,type' });
    return sourcesResult.error ? sourcesResult.error.message : null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    const error = await persist();
    setSaving(false);
    if (error) toast.error(t('settings.saveError'), { description: error });
    else toast.success(t('settings.saved'));
  }

  async function testConnection() {
    setTesting(true);
    const id = toast.loading(t('settings.testing'));
    const saveError = await persist();
    if (saveError) {
      setTesting(false);
      toast.error(t('settings.saveError'), { id, description: saveError });
      return;
    }
    const { data, error } = await callFunction<{ ok: boolean; message: string }>(
      'test-connection',
      {
        target: 'llm',
      },
    );
    setTesting(false);
    if (error || !data) {
      toast.error(t('settings.testFailed'), { id, description: error ?? t('common.error') });
    } else if (data.ok) {
      toast.success(t('settings.testOk'), { id, description: data.message });
    } else {
      const notFound = /model_not_found|does not exist|not found/i.test(data.message);
      toast.error(t('settings.testFailed'), {
        id,
        description: notFound ? `${t('settings.modelNotFound')} ${data.message}` : data.message,
      });
    }
  }

  async function loadModels() {
    setLoadingModels(true);
    const saveError = await persist();
    if (saveError) {
      setLoadingModels(false);
      toast.error(t('settings.saveError'), { description: saveError });
      return;
    }
    const { data, error } = await callFunction<{ ok: boolean; message?: string; models: string[] }>(
      'test-connection',
      { target: 'models' },
    );
    setLoadingModels(false);
    if (error || !data?.ok) {
      toast.error(t('settings.modelsFailed'), { description: error ?? data?.message });
      return;
    }
    setModels(data.models);
    toast.success(t('settings.modelsLoaded', { count: data.models.length }));
  }

  const isOllama = form.provider === 'ollama';
  const toggleSource = (type: string, value: boolean) =>
    setSources((s) => ({ ...s, enabled: { ...s.enabled, [type]: value } }));

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description')}
        actions={
          <div className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 sm:w-auto">
            <div className="grid text-left sm:text-right">
              <Label htmlFor="advanced-settings" className="sm:justify-end">
                {t('settings.advanced')}
              </Label>
              <span className="text-xs text-muted-foreground">{t('settings.advancedHint')}</span>
            </div>
            <Switch id="advanced-settings" checked={advanced} onCheckedChange={toggleAdvanced} />
          </div>
        }
      />

      {loaded.error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {loaded.error}
        </p>
      )}

      {loaded.loading ? (
        <SettingsSkeleton />
      ) : (
        <>
          <InstallAppCard />

          <SectionCard title={t('settings.llmTitle')} description={t('settings.llmDescription')}>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label={t('settings.provider')}>
                <Select
                  value={form.provider}
                  onValueChange={(value) => {
                    if ((PROVIDERS as readonly string[]).includes(value)) {
                      set('provider', value as SettingsForm['provider']);
                      setModels([]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider} className="capitalize">
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField
                label={t('settings.model')}
                description={`${t('settings.modelHint')}: ${DEFAULT_MODELS[form.provider]}`}
              >
                <Input
                  value={form.model}
                  onChange={(e) => set('model', e.target.value)}
                  placeholder={DEFAULT_MODELS[form.provider]}
                  list="llm-models"
                />
              </FormField>
            </div>
            <datalist id="llm-models">
              {models.map((model) => (
                <option key={model} value={model} />
              ))}
            </datalist>
            {models.length > 0 && (
              <div className="grid gap-2">
                <Label>{t('settings.availableModels')}</Label>
                <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
                  {models.map((model) => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => set('model', model)}
                      className={`rounded-md border px-2 py-1 font-mono text-xs transition-colors ${form.model === model ? 'border-primary bg-primary/10 text-brand-600 dark:text-primary' : 'hover:bg-accent'}`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {isOllama ? (
              <FormField label={t('settings.baseUrl')}>
                <Input
                  value={form.baseUrl}
                  onChange={(e) => set('baseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                />
              </FormField>
            ) : (
              <SecretField
                label={t('settings.apiKey')}
                kind="llm"
                last4={last4('llm')}
                onChanged={secrets.reload}
                helpText={t('settings.secretHelp')}
              />
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t('settings.privacyNote')}</p>
              <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  disabled={loadingModels || testing}
                  onClick={() => void loadModels()}
                >
                  {loadingModels ? <Loader2 className="animate-spin" /> : <ListFilter />}
                  {t('settings.loadModels')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={testing}
                  onClick={() => void testConnection()}
                >
                  {testing ? <Loader2 className="animate-spin" /> : <PlugZap />}
                  {testing ? t('settings.testing') : t('settings.testConnection')}
                </Button>
              </div>
            </div>
          </SectionCard>

          <PushSettings />

          {advanced && (
            <SectionCard
              title={t('settings.matchingTitle')}
              description={t('settings.matchingDescription')}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={t('settings.minScore')}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="tabular-nums"
                    value={form.minScore}
                    onChange={(e) => set('minScore', clamp(e.target.value, 0, 100))}
                  />
                </FormField>
                <FormField label={t('settings.dailyLimit')}>
                  <Input
                    type="number"
                    min={0}
                    className="tabular-nums"
                    value={form.dailyLimit}
                    onChange={(e) => set('dailyLimit', clamp(e.target.value, 0, 100000))}
                  />
                </FormField>
                <FormField label={t('settings.frequency')}>
                  <Input
                    type="number"
                    min={1}
                    max={168}
                    className="tabular-nums"
                    value={form.frequency}
                    onChange={(e) => set('frequency', clamp(e.target.value, 1, 168))}
                  />
                </FormField>
                <FormField label={t('settings.concurrency')}>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    className="tabular-nums"
                    value={form.concurrency}
                    onChange={(e) => set('concurrency', clamp(e.target.value, 1, 10))}
                  />
                </FormField>
              </div>
            </SectionCard>
          )}

          <SectionCard title={t('settings.sourcesTitle')} description={t('settings.sourcesHint')}>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOURCE_TYPES.map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                >
                  <Label htmlFor={`source-${type}`} className="font-normal">
                    {t(`settings.sourceNames.${type}`)}
                  </Label>
                  <Switch
                    id={`source-${type}`}
                    checked={sources.enabled[type] ?? type !== 'linkedin'}
                    onCheckedChange={(value) => toggleSource(type, value)}
                  />
                </div>
              ))}
            </div>
            {sources.enabled.linkedin && (
              <div className="space-y-4 rounded-lg border border-warning/40 bg-warning/5 p-4">
                <div className="flex gap-2 text-sm">
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground">{t('settings.linkedinWarning')}</p>
                </div>
                <FormField
                  label={t('settings.linkedinSearches')}
                  description={t('settings.linkedinSearchesHint')}
                >
                  <Textarea
                    rows={3}
                    value={sources.linkedinSearches}
                    placeholder={'full stack\nreact developer'}
                    onChange={(e) =>
                      setSources((s) => ({ ...s, linkedinSearches: e.target.value }))
                    }
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
                  <FormField label={t('settings.linkedinLocation')}>
                    <Input
                      value={sources.linkedinLocation}
                      onChange={(e) =>
                        setSources((s) => ({ ...s, linkedinLocation: e.target.value }))
                      }
                    />
                  </FormField>
                  <div className="flex h-9 items-center justify-between gap-2 rounded-md border bg-background px-3">
                    <Label htmlFor="linkedin-remote" className="font-normal">
                      {t('settings.linkedinRemoteOnly')}
                    </Label>
                    <Switch
                      id="linkedin-remote"
                      checked={sources.linkedinRemoteOnly}
                      onCheckedChange={(value) =>
                        setSources((s) => ({ ...s, linkedinRemoteOnly: value }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                label={t('settings.netempregosCategories')}
                description={t('settings.netempregosHint')}
              >
                <Textarea
                  rows={3}
                  value={sources.netempregos}
                  onChange={(e) => setSources((s) => ({ ...s, netempregos: e.target.value }))}
                />
              </FormField>
              <FormField label={t('settings.greenhouseCompanies')}>
                <Textarea
                  rows={3}
                  value={sources.greenhouse}
                  onChange={(e) => setSources((s) => ({ ...s, greenhouse: e.target.value }))}
                />
              </FormField>
              <FormField label={t('settings.leverCompanies')}>
                <Textarea
                  rows={3}
                  value={sources.lever}
                  onChange={(e) => setSources((s) => ({ ...s, lever: e.target.value }))}
                />
              </FormField>
              <FormField label={t('settings.itjobsQuery')}>
                <Input
                  value={sources.itjobsQuery}
                  onChange={(e) => setSources((s) => ({ ...s, itjobsQuery: e.target.value }))}
                />
              </FormField>
            </div>
          </SectionCard>

          {advanced && (
            <SectionCard
              title={t('settings.integrationsTitle')}
              description={t('settings.integrationsDescription')}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label={`${t('settings.adzunaAppId')} (${t('settings.optional')})`}>
                  <Input
                    value={form.adzunaAppId}
                    onChange={(e) => set('adzunaAppId', e.target.value)}
                  />
                </FormField>
                <FormField label={t('settings.adzunaCountry')}>
                  <Input
                    value={sources.adzunaCountry}
                    onChange={(e) => setSources((s) => ({ ...s, adzunaCountry: e.target.value }))}
                  />
                </FormField>
                <FormField label={t('settings.adzunaQuery')} className="sm:col-span-2">
                  <Input
                    value={sources.adzunaQuery}
                    onChange={(e) => setSources((s) => ({ ...s, adzunaQuery: e.target.value }))}
                  />
                </FormField>
              </div>
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
            </SectionCard>
          )}
        </>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">{t('settings.saveHint')}</p>
          <Button type="submit" disabled={saving || loaded.loading} className="w-full sm:w-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? t('ui.saving') : t('settings.saveAll')}
          </Button>
        </div>
      </div>
    </form>
  );
}
