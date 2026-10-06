import { ArrowLeft, House, SearchX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../components/marketing/Brand';
import { useAuth } from '../lib/auth';

export default function NotFound() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950">
      <header className="mx-auto w-full max-w-6xl px-4 py-5">
        <Brand />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-20">
        <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-deep px-6 py-14 text-center sm:px-12">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-56 w-56 rotate-12 rounded-[3rem] border border-white/10" />
          <div className="relative">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-brand-300 ring-1 ring-white/15">
              <SearchX className="h-7 w-7" strokeWidth={1.75} />
            </span>
            <p className="mt-6 font-display text-7xl font-semibold tracking-tight text-white sm:text-8xl">
              404
            </p>
            <h1 className="mt-3 font-display text-2xl font-semibold text-white">
              {t('notFound.title')}
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm text-white/70">{t('notFound.text')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to={session ? '/app' : '/'}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-deep hover:bg-brand-50"
              >
                <House className="h-4 w-4" strokeWidth={1.75} />
                {session ? t('landing.dashboard') : t('notFound.home')}
              </Link>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:border-white/60"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                {t('common.back')}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
