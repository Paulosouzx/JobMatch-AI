import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { translateAuthError } from '../../lib/auth-errors';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const { t } = useTranslation();
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => navigate('/app', { replace: true }), 1500);
    return () => clearTimeout(timer);
  }, [done, navigate]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 8) return setError(t('auth.passwordShort'));
    if (password !== confirm) return setError(t('auth.passwordMismatch'));
    setBusy(true);
    const { error: failure } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (failure) setError(translateAuthError(failure.message));
    else setDone(true);
  }

  const missingSession = !loading && !session;

  return (
    <AuthLayout title={t('auth.resetTitle')}>
      {missingSession && <Alert>{translateAuthError('invalid token')}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4">
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
        {done && <Alert kind="success">{t('auth.resetDone')}</Alert>}
        <Button type="submit" disabled={busy || missingSession} className="w-full">
          {t('auth.submitReset')}
        </Button>
      </form>
    </AuthLayout>
  );
}
