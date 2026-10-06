import { useTranslation } from 'react-i18next';
import { Alert } from './ui';

export function ConfigMissing() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-lg px-4 py-20">
      <Alert kind="info">{t('auth.notConfigured')}</Alert>
    </main>
  );
}
