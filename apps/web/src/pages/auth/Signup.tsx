import { ArrowLeft, GitFork, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { IconField, PasswordField, PrimaryButton } from '../../components/auth/AuthUI';
import { Alert } from '../../components/ui';
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
      <AuthLayout
        title={t('auth.signupsClosedTitle')}
        subtitle={t('auth.signupsClosedText')}
        tab="signup"
      >
        <a
          href={`${config.repoUrl}#self-hosting`}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <GitFork className="h-4 w-4" strokeWidth={1.75} />
          {t('auth.selfHost')}
        </a>
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          {t('auth.tabLogin')}
        </Link>
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
    <AuthLayout title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')} tab="signup">
      <form onSubmit={onSubmit} className="space-y-4">
        <IconField
          icon={Mail}
          label={t('common.email')}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordField
          icon={LockKeyhole}
          label={t('common.password')}
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          icon={LockKeyhole}
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          placeholder="••••••••"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <PrimaryButton type="submit" disabled={busy}>
          {t('auth.submitSignup')}
        </PrimaryButton>
      </form>
      <p className="hidden text-center text-sm text-slate-500 lg:block dark:text-slate-400">
        {t('auth.haveAccount')}{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          {t('auth.tabLogin')}
        </Link>
      </p>
    </AuthLayout>
  );
}
