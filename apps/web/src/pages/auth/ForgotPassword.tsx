import { ArrowLeft, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { IconField, PrimaryButton } from '../../components/auth/AuthUI';
import { Alert } from '../../components/ui';
import { translateAuthError } from '../../lib/auth-errors';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: failure } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (failure) setError(translateAuthError(failure.message));
    else setInfo(t('auth.forgotSent'));
  }

  return (
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
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
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <PrimaryButton type="submit" disabled={busy}>
          {t('auth.submitForgot')}
        </PrimaryButton>
      </form>
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        {t('common.back')}
      </Link>
    </AuthLayout>
  );
}
