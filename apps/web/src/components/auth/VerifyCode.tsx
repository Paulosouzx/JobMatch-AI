import { ArrowLeft, MailCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { translateAuthError } from '../../lib/auth-errors';
import { supabase } from '../../lib/supabase';
import { Alert } from '../legacy-ui';
import { PrimaryButton } from './AuthUI';

export type CodeType = 'email' | 'signup';

const RESEND_SECONDS = 60;

export function VerifyCode({
  email,
  type,
  onVerified,
  onBack,
}: {
  email: string;
  type: CodeType;
  onVerified: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: failure } = await supabase.auth.verifyOtp({ email, token: code, type });
    setBusy(false);
    if (failure) setError(t('verify.invalid'));
    else onVerified();
  }

  async function resend() {
    setError(null);
    setInfo(null);
    const { error: failure } =
      type === 'signup'
        ? await supabase.auth.resend({ type: 'signup', email })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (failure) {
      setError(translateAuthError(failure.message));
      return;
    }
    setInfo(t('verify.resent'));
    setCooldown(RESEND_SECONDS);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center rounded-3xl bg-brand-50 px-4 py-6 text-center dark:bg-brand-950/40">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-sm ring-1 ring-brand-100 dark:bg-slate-900 dark:ring-brand-900">
          <MailCheck className="h-7 w-7" strokeWidth={1.75} />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-slate-900 dark:text-white">
          {type === 'signup' ? t('verify.signupTitle') : t('verify.loginTitle')}
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('verify.text')}{' '}
          <strong className="break-all text-slate-900 dark:text-white">{email}</strong>
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('verify.codeLabel')}
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 10))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            required
            minLength={6}
            placeholder="••••••"
            className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 text-center font-display text-2xl font-semibold tracking-[0.5em] text-slate-900 placeholder:text-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-white"
          />
        </label>
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <PrimaryButton type="submit" disabled={busy || code.length < 6}>
          {t('verify.submit')}
        </PrimaryButton>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {t('verify.changeEmail')}
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="font-medium text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline dark:text-brand-400"
        >
          {cooldown > 0 ? t('verify.resendIn', { seconds: cooldown }) : t('verify.resend')}
        </button>
      </div>
      <p className="text-center text-xs text-slate-400">{t('verify.spamHint')}</p>
    </div>
  );
}
