import { LockKeyhole } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/AuthLayout';
import { PasswordField, PrimaryButton } from '../../components/auth/AuthUI';
import { Alert } from '../../components/ui';
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
    <AuthLayout title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      {missingSession && <Alert>{translateAuthError('invalid token')}</Alert>}
      <form onSubmit={onSubmit} className="space-y-4">
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
        {done && <Alert kind="success">{t('auth.resetDone')}</Alert>}
        <PrimaryButton type="submit" disabled={busy || missingSession}>
          {t('auth.submitReset')}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
