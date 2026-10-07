import { DEFAULT_STYLE_GUIDE } from '@jobmatch/core';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { FormField } from '@/components/app/FormField';
import { PageHeader } from '@/components/app/PageHeader';
import { TagInput } from '@/components/app/TagInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { loadStyleGuide } from '@/lib/resume';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

export default function StyleGuidePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const guide = useAsync(loadStyleGuide, []);
  const [rules, setRules] = useState('');
  const [banned, setBanned] = useState<string[]>([]);
  const [samples, setSamples] = useState<string[]>(['', '', '']);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!guide.data) return;
    setRules(guide.data.rules.join('\n'));
    setBanned(guide.data.bannedPhrases);
    setSamples([0, 1, 2].map((index) => guide.data?.samples[index] ?? ''));
  }, [guide.data]);

  function restoreDefaults() {
    setRules(DEFAULT_STYLE_GUIDE.rules.join('\n'));
    setBanned(DEFAULT_STYLE_GUIDE.bannedPhrases);
    toast.info(t('style.defaultsRestored'));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('jm_style_guides').upsert({
      user_id: session?.user.id,
      rules: rules
        .split('\n')
        .map((rule) => rule.trim())
        .filter(Boolean),
      banned_phrases: banned,
      samples: samples.map((sample) => sample.trim()).filter(Boolean),
    });
    setSaving(false);
    if (error) toast.error(t('style.saveError'), { description: error.message });
    else toast.success(t('style.saved'));
  }

  if (guide.loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <PageHeader
        title={t('style.title')}
        description={t('style.description')}
        actions={
          <Button variant="outline" onClick={restoreDefaults}>
            <RotateCcw />
            {t('style.restore')}
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle className="text-base">{t('style.rulesTitle')}</CardTitle>
          <CardDescription>{t('style.rulesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="py-5">
          <Textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            className="min-h-48 text-sm"
            aria-label={t('style.rulesTitle')}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle className="text-base">{t('style.bannedTitle')}</CardTitle>
          <CardDescription>{t('style.bannedHint')}</CardDescription>
        </CardHeader>
        <CardContent className="py-5">
          <TagInput
            value={banned}
            onChange={setBanned}
            tone="danger"
            ariaLabel={t('style.bannedTitle')}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-5">
          <CardTitle className="text-base">{t('style.samplesTitle')}</CardTitle>
          <CardDescription>{t('style.samplesHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          {samples.map((sample, index) => (
            <FormField key={index} label={t('style.sample', { index: index + 1 })}>
              <Textarea
                value={sample}
                onChange={(e) =>
                  setSamples((current) =>
                    current.map((value, position) => (position === index ? e.target.value : value)),
                  )
                }
                className="min-h-28 text-sm"
              />
            </FormField>
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">{t('style.appliesTo')}</p>
          <Button onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {t('style.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
