import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Alert, Button, Field, Input } from '../../components/ui';
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
    <AuthLayout title={t('auth.forgotTitle')}>
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
        {error && <Alert>{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {t('auth.submitForgot')}
        </Button>
      </form>
      <Link to="/login" className="text-sm text-indigo-600 hover:underline">
        {t('common.back')}
      </Link>
    </AuthLayout>
  );
}
