import { LockKeyhole, Mail, WandSparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import {
  Divider,
  IconField,
  OAuthButtons,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
} from '../../components/auth/AuthUI';
import { VerifyCode, type CodeType } from '../../components/auth/VerifyCode';
import { Alert } from '../../components/ui';
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
  const [pending, setPending] = useState<{ email: string; type: CodeType } | null>(null);

  if (session) return <Navigate to={target} replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: failure } = await supabase.auth.signInWithPassword({ email, password });
    if (failure && /email not confirmed/i.test(failure.message)) {
      const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
      setBusy(false);
      if (resendError) setError(translateAuthError(resendError.message));
      else setPending({ email, type: 'signup' });
      return;
    }
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
    else setPending({ email, type: 'email' });
  }

  if (pending) {
    return (
      <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} tab="login">
        <VerifyCode
          email={pending.email}
          type={pending.type}
          onVerified={() => navigate(target, { replace: true })}
          onBack={() => setPending(null)}
        />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} tab="login">
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
          autoComplete="current-password"
          placeholder="••••••••"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            {t('auth.forgotLink')}
          </Link>
        </div>
        {error && <Alert>{error}</Alert>}
        <PrimaryButton type="submit" disabled={busy}>
          {t('auth.submitLogin')}
        </PrimaryButton>
      </form>

      <Divider label={t('auth.orContinue')} />

      <OAuthButtons redirectPath={target} onError={setError} />
      <SecondaryButton type="button" disabled={busy} onClick={() => void sendMagicLink()}>
        <WandSparkles className="h-4 w-4 text-brand-600" strokeWidth={1.75} />
        {t('auth.magicLink')}
      </SecondaryButton>
    </AuthLayout>
  );
}
