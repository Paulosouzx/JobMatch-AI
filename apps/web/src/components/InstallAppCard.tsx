import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { promptInstall, useInstallState } from '../lib/install';
import { Alert, Button, Card } from './ui';

export function InstallAppCard() {
  const { t } = useTranslation();
  const state = useInstallState();
  const [busy, setBusy] = useState(false);

  async function install() {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{t('install.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('install.description')}</p>
      {state === 'installed' && <Alert kind="success">{t('install.installed')}</Alert>}
      {state === 'available' && (
        <Button type="button" disabled={busy} onClick={() => void install()}>
          {t('install.button')}
        </Button>
      )}
      {state === 'ios' && <Alert kind="info">{t('install.ios')}</Alert>}
      {state === 'unavailable' && <Alert kind="info">{t('install.manual')}</Alert>}
    </Card>
  );
}
