import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { translateAuthError } from '../../lib/auth-errors';
import { config } from '../../lib/config';
import { APP_TAG, supabase } from '../../lib/supabase';

function safeRedirect(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : '/app';
}

export default function Login() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = safeRedirect((location.state as { from?: string } | null)?.from);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (session) return <Navigate to={target} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (failure) setError(translateAuthError(failure.message));
    else navigate(target, { replace: true });
  }

  async function sendMagicLink() {
    if (!email) {
      setError(translateAuthError('invalid email'));
      return;
    }
    setBusy(true);
    setError(null);
    const { error: failure } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: config.allowSignups,
        data: APP_TAG,
        emailRedirectTo: `${window.location.origin}${target}`,
      },
    });
    setBusy(false);
    if (failure) setError(translateAuthError(failure.message));
    else setInfo(t('auth.magicLinkSent'));
  }

  async function signInWithGithub() {
    const { error: failure } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}${target}` },
    });
    if (failure) setError(translateAuthError(failure.message));
  }

  return (
    <AuthLayout title={t('auth.loginTitle')}>
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {t('auth.submitLogin')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={sendMagicLink}
          className="w-full"
        >
          {t('auth.magicLink')}
        </Button>
        {config.githubOAuth && (
          <Button type="button" variant="secondary" onClick={signInWithGithub} className="w-full">
            {t('auth.withGithub')}
          </Button>
        )}
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/forgot-password" className="text-indigo-600 hover:underline">
          {t('auth.forgotLink')}
        </Link>
        <Link to="/signup" className="text-indigo-600 hover:underline">
          {t('auth.signupTitle')}
        </Link>
      </div>
    </AuthLayout>
  );
}
