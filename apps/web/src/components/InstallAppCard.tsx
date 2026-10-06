import { CircleCheck, Download, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { promptInstall, useInstallState } from '@/lib/install';

export function InstallAppCard() {
  const { t } = useTranslation();
  const state = useInstallState();
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    try {
      if (await promptInstall()) toast.success(t('install.installedToast'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex-row items-center gap-4 p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
        <Smartphone className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t('install.title')}</p>
        <p className="text-xs text-muted-foreground">
          {state === 'installed'
            ? t('install.installed')
            : state === 'ios'
              ? t('install.ios')
              : state === 'unavailable'
                ? t('install.manual')
                : t('install.description')}
        </p>
      </div>
      {state === 'available' && (
        <Button type="button" variant="success" disabled={busy} onClick={() => void install()}>
          <Download />
          {t('install.button')}
        </Button>
      )}
      {state === 'installed' && (
        <CircleCheck className="size-5 shrink-0 text-success" aria-hidden="true" />
      )}
    </Card>
  );
}
