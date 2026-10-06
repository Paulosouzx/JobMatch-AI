import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { translateAuthError } from '../../lib/auth-errors';
import { config } from '../../lib/config';
import { APP_TAG, supabase } from '../../lib/supabase';

export default function Signup() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Navigate to="/app" replace />;

  if (!config.allowSignups) {
    return (
      <AuthLayout title={t('auth.signupsClosedTitle')}>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('auth.signupsClosedText')}</p>
        <a
          href={`${config.repoUrl}#self-hosting`}
          className="inline-block text-sm font-medium text-indigo-600 hover:underline"
        >
          {t('auth.selfHost')}
        </a>
        <div className="text-sm">
          <Link to="/login" className="text-indigo-600 hover:underline">
            {t('auth.loginTitle')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) return setError(t('auth.passwordShort'));
    if (password !== confirm) return setError(t('auth.passwordMismatch'));
    setBusy(true);
    const { error: failure } = await supabase.auth.signUp({
      email,
      password,
      options: { data: APP_TAG, emailRedirectTo: `${window.location.origin}/app` },
    });
    setBusy(false);
    if (failure) setError(translateAuthError(failure.message));
    else setInfo(t('auth.signupSent'));
  }

  return (
    <AuthLayout title={t('auth.signupTitle')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={t('common.email')}>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t('common.password')}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label={t('auth.confirmPassword')}>
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {t('auth.submitSignup')}
        </Button>
      </form>
      <p className="text-sm">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          {t('auth.loginTitle')}
        </Link>
      </p>
    </AuthLayout>
  );
}
