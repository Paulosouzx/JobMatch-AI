import { finalFields } from '@jobmatch/core';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { AppLoader } from '@/components/app/AppLoader';
import { ResumeDocument } from '@/components/resume/ResumeDocument';
import { Button } from '@/components/ui/button';
import { loadTemplate, type ResumeVersionRow } from '@/lib/resume';
import { supabase } from '@/lib/supabase';
import { useAsync } from '@/lib/useAsync';

export default function PrintResume() {
  const { t } = useTranslation();
  const { versionId } = useParams();

  const doc = useAsync(async () => {
    const template = await loadTemplate();
    if (!template) return null;
    if (!versionId) return { template, fields: template.fields, company: null as string | null };
    const { data, error } = await supabase
      .from('jm_resume_versions')
      .select('base_fields, review, final_fields, jm_jobs(company)')
      .eq('id', versionId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const version = data as unknown as ResumeVersionRow & { jm_jobs: { company: string } | null };
    return {
      template,
      fields: version.final_fields ?? finalFields(version.base_fields, version.review),
      company: version.jm_jobs?.company ?? null,
    };
  }, [versionId]);

  useEffect(() => {
    if (!doc.data) return;
    const name = doc.data.template.structure.name.replace(/\s+/g, '-');
    document.title = doc.data.company
      ? `${name}-CV-${doc.data.company.replace(/\s+/g, '-')}`
      : `${name}-CV`;
  }, [doc.data]);

  if (doc.loading) return <AppLoader />;
  if (!doc.data) {
    return <p className="p-8 text-sm text-muted-foreground">{t('resume.notFound')}</p>;
  }

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-background/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => window.close()}>
          <ArrowLeft />
          {t('common.back')}
        </Button>
        <p className="hidden text-xs text-muted-foreground sm:block">{t('resume.printHint')}</p>
        <Button size="sm" onClick={() => window.print()}>
          <Printer />
          {t('resume.print')}
        </Button>
      </div>
      <div className="py-6 print:py-0">
        <div className="mx-auto w-fit max-w-full overflow-x-auto shadow-sm print:shadow-none">
          <ResumeDocument structure={doc.data.template.structure} fields={doc.data.fields} />
        </div>
      </div>
    </div>
  );
}
