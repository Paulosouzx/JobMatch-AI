import { fieldKeysOf } from '@jobmatch/core';
import { Eye, FileText, Loader2, RotateCcw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/app/EmptyState';
import { PageHeader } from '@/components/app/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { loadTemplate } from '@/lib/resume';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

interface Group {
  title: string;
  subtitle?: string;
  keys: { key: string; label: string }[];
}

export default function ResumeTemplate() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const template = useAsync(loadTemplate, []);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [adaptable, setAdaptable] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!template.data) return;
    setFields(template.data.fields);
    setAdaptable(new Set(template.data.adaptable));
  }, [template.data]);

  const groups = useMemo<Group[]>(() => {
    const structure = template.data?.structure;
    if (!structure) return [];
    const result: Group[] = [];
    for (const section of structure.sections) {
      if (section.type === 'summary') {
        result.push({ title: section.title, keys: [{ key: section.field, label: section.title }] });
      }
      if (section.type === 'skills') {
        result.push({
          title: section.title,
          keys: section.groups.map((group) => ({ key: group.field, label: group.label })),
        });
      }
      if (section.type === 'experience') {
        for (const item of section.items) {
          result.push({
            title: item.heading,
            subtitle: `${section.title} · ${item.dates}`,
            keys: [
              ...(item.stackField
                ? [{ key: item.stackField, label: item.stackLabel ?? 'Stack' }]
                : []),
              ...item.bullets.map((key, index) => ({ key, label: `Bullet ${index + 1}` })),
            ],
          });
        }
      }
    }
    return result;
  }, [template.data]);

  const allKeys = template.data ? fieldKeysOf(template.data.structure) : [];

  function toggle(key: string, value: boolean) {
    setAdaptable((current) => {
      const next = new Set(current);
      if (value) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function setAll(value: boolean, filter: (key: string) => boolean) {
    setAdaptable((current) => {
      const next = new Set(current);
      for (const key of allKeys.filter(filter)) {
        if (value) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('jm_resume_templates')
      .update({ fields, adaptable: allKeys.filter((key) => adaptable.has(key)) })
      .eq('user_id', session?.user.id ?? '');
    setSaving(false);
    if (error) toast.error(t('resume.saveError'), { description: error.message });
    else toast.success(t('resume.saved'));
  }

  if (template.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!template.data) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('resume.title')} description={t('resume.description')} />
        <EmptyState
          icon={FileText}
          title={t('resume.emptyTitle')}
          description={t('resume.emptyText')}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-24">
      <PageHeader
        title={t('resume.title')}
        description={t('resume.description')}
        actions={
          <Button asChild variant="outline">
            <Link to="/print/resume" target="_blank">
              <Eye />
              {t('resume.preview')}
            </Link>
          </Button>
        }
      />

      <Card className="gap-3 p-5">
        <p className="text-sm text-muted-foreground">{t('resume.adaptableHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAll(true, (key) => key.includes('_bullet'))}
          >
            {t('resume.markBullets')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAll(false, () => true)}>
            <RotateCcw />
            {t('resume.unmarkAll')}
          </Button>
          <Badge variant="secondary" className="self-center tabular-nums">
            {t('resume.adaptableCount', { count: adaptable.size, total: allKeys.length })}
          </Badge>
        </div>
      </Card>

      {groups.map((group) => (
        <Card key={`${group.title}-${group.subtitle ?? ''}`} className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">{group.title}</CardTitle>
            {group.subtitle && <CardDescription>{group.subtitle}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 py-5">
            {group.keys.map(({ key, label }) => (
              <div key={key} className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor={`field-${key}`} className="text-xs text-muted-foreground">
                    {label} <code className="ml-1 text-[10px] opacity-60">{`{{${key}}}`}</code>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`adapt-${key}`}
                      checked={adaptable.has(key)}
                      onCheckedChange={(value) => toggle(key, value === true)}
                    />
                    <Label htmlFor={`adapt-${key}`} className="text-xs font-normal">
                      {t('resume.adaptable')}
                    </Label>
                  </div>
                </div>
                <Textarea
                  id={`field-${key}`}
                  value={fields[key] ?? ''}
                  onChange={(e) => setFields((current) => ({ ...current, [key]: e.target.value }))}
                  className="min-h-0 text-sm"
                  rows={2}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t('resume.structureFixed')}
          </p>
          <Button onClick={() => void save()} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {t('resume.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
