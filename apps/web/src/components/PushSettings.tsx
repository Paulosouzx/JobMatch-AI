import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  disablePush,
  enablePush,
  getPushState,
  isIosWithoutInstall,
  type PushState,
} from '../lib/push';
import { supabase } from '../lib/supabase';
import { Alert, Button, Card } from './ui';

export function PushSettings() {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    kind: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    getPushState()
      .then(setState)
      .catch(() => setState('unsupported'));
  }, []);

  async function run(action: () => Promise<PushState>) {
    setBusy(true);
    setMessage(null);
    try {
      const next = await action();
      setState(next);
      if (next === 'denied') setMessage({ kind: 'error', text: t('push.deniedHelp') });
    } catch (error) {
      setMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : t('common.error'),
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setBusy(true);
    setMessage(null);
    const { data, error } = await supabase.functions.invoke('test-connection', {
      body: { target: 'push' },
    });
    setBusy(false);
    if (error || !data) setMessage({ kind: 'error', text: t('common.error') });
    else setMessage({ kind: data.ok ? 'success' : 'error', text: String(data.message) });
  }

  return (
    <Card className="space-y-4">
      <h2 className="font-semibold">{t('push.title')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('push.description')}</p>

      {state === 'unsupported' && (
        <Alert kind="info">
          {isIosWithoutInstall() ? t('push.iosHelp') : t('push.unsupported')}
        </Alert>
      )}
      {state === 'denied' && <Alert>{t('push.deniedHelp')}</Alert>}

      {state !== null && state !== 'unsupported' && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">
            {t('push.status')}: <strong>{t(`push.states.${state}`)}</strong>
          </span>
          {state === 'enabled' ? (
            <>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void sendTest()}
              >
                {t('push.test')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => void run(disablePush)}
              >
                {t('push.disable')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={busy || state === 'denied'}
              onClick={() => void run(enablePush)}
            >
              {t('push.enable')}
            </Button>
          )}
        </div>
      )}
      <p className="text-xs text-slate-500">{t('push.perDevice')}</p>
      {message && <Alert kind={message.kind}>{message.text}</Alert>}
    </Card>
  );
}
