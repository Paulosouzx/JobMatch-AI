import { LogOut, ShieldX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Brand } from '../components/marketing/Brand';
import { Spinner } from '../components/legacy-ui';
import { useAuth } from '../lib/auth';
import { config } from '../lib/config';

function AccessDenied({ kind }: { kind: 'denied' | 'error' }) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-white px-4 dark:bg-slate-950">
      <Brand />
      <div className="w-full max-w-md rounded-3xl border border-slate-200 p-8 text-center dark:border-slate-800">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300">
          <ShieldX className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-4 font-display text-xl font-semibold">
          {kind === 'denied' ? t('auth.signupsClosedTitle') : t('common.error')}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {kind === 'denied' ? t('auth.signupsClosedText') : t('auth.accessError')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-500"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            {t('nav.logout')}
          </button>
          {kind === 'denied' && (
            <a
              href={`${config.repoUrl}#self-hosting`}
              className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium hover:border-slate-900 dark:border-slate-700 dark:hover:border-white"
            >
              {t('auth.selfHost')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function RequireAuth() {
  const { session, loading, access } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (loading) return <Spinner label={t('common.loading')} />;
  if (!session) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (access === 'checking') return <Spinner label={t('common.loading')} />;
  if (access === 'denied' || access === 'error') return <AccessDenied kind={access} />;
  return <Outlet />;
}
