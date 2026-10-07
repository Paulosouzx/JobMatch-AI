import { BellOff, BellRing, Loader2, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { StatusBadge, type StatusTone } from '@/components/app/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { callFunction } from '@/lib/functions';
import {
  disablePush,
  enablePush,
  getPushState,
  isIosWithoutInstall,
  type PushState,
} from '@/lib/push';

const STATE_TONE: Record<PushState, StatusTone> = {
  enabled: 'success',
  disabled: 'neutral',
  denied: 'danger',
  unsupported: 'warning',
};

export function PushSettings() {
  const { t } = useTranslation();
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState<'toggle' | 'test' | null>(null);

  useEffect(() => {
    getPushState()
      .then(setState)
      .catch(() => setState('unsupported'));
  }, []);

  async function run(action: () => Promise<PushState>, success: string) {
    setBusy('toggle');
    try {
      const next = await action();
      setState(next);
      if (next === 'denied') toast.error(t('push.deniedHelp'));
      else toast.success(success);
    } catch (error) {
      toast.error(t('common.error'), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    setBusy('test');
    const { data, error } = await callFunction<{ ok: boolean; message: string }>(
      'test-connection',
      {
        target: 'push',
      },
    );
    setBusy(null);
    if (error || !data)
      toast.error(t('push.testFailed'), { description: error ?? t('common.error') });
    else if (data.ok) toast.success(t('push.testSent'), { description: data.message });
    else toast.error(t('push.testFailed'), { description: data.message });
  }

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5">
        <CardTitle className="text-base">{t('push.title')}</CardTitle>
        <CardDescription>{t('push.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 py-6">
        {state === 'unsupported' && (
          <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {isIosWithoutInstall() ? t('push.iosHelp') : t('push.unsupported')}
          </p>
        )}
        {state === 'denied' && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {t('push.deniedHelp')}
          </p>
        )}
        {state !== null && state !== 'unsupported' && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('push.status')}</span>
              <StatusBadge tone={STATE_TONE[state]}>{t(`push.states.${state}`)}</StatusBadge>
            </div>
            <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
              {state === 'enabled' ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void sendTest()}
                  >
                    {busy === 'test' ? <Loader2 className="animate-spin" /> : <Send />}
                    {t('push.test')}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive-outline"
                    disabled={busy !== null}
                    onClick={() => void run(disablePush, t('push.disabledToast'))}
                  >
                    <BellOff />
                    {t('push.disable')}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="success"
                  className="h-auto min-h-9 whitespace-normal"
                  disabled={busy !== null || state === 'denied'}
                  onClick={() => void run(enablePush, t('push.enabledToast'))}
                >
                  {busy === 'toggle' ? <Loader2 className="animate-spin" /> : <BellRing />}
                  {t('push.enable')}
                </Button>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">{t('push.perDevice')}</p>
      </CardContent>
    </Card>
  );
}
