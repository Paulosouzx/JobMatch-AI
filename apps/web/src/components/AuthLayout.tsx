import {
  ArrowLeft,
  BellRing,
  Briefcase,
  LayoutDashboard,
  Settings2,
  UserRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AuthTabs } from './auth/AuthUI';
import { Brand } from './marketing/Brand';
import { MatchCard, MiniBars, ScoreRing } from './marketing/Mockups';

interface MockJob {
  title: string;
  company: string;
  score: number;
}

function DashboardMock() {
  const { t } = useTranslation();
  const days = t('landing.mock.days', { returnObjects: true }) as string[];
  const jobs = t('auth.panelJobs', { returnObjects: true }) as MockJob[];
  const nav = [LayoutDashboard, Briefcase, UserRound, BellRing, Settings2];
  return (
    <div
      className="flex w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-brand-950/30"
      aria-hidden="true"
    >
      <div className="flex w-12 flex-col items-center gap-4 border-r border-slate-100 py-4">
        <span className="h-6 w-6 rounded-lg bg-brand-600" />
        {nav.map((Icon, index) => (
          <Icon
            key={index}
            className={`h-4 w-4 ${index === 1 ? 'text-brand-600' : 'text-slate-300'}`}
            strokeWidth={1.75}
          />
        ))}
      </div>
      <div className="flex-1 space-y-4 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-900">{t('landing.mock.chartTitle')}</p>
          <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[9px] text-slate-500">
            {t('landing.mock.chartRange')}
          </span>
        </div>
        <MiniBars days={days} />
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li
              key={job.title}
              className="flex items-center gap-3 rounded-xl border border-slate-100 p-2"
            >
              <ScoreRing score={job.score} size={34} />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-semibold text-slate-900">{job.title}</p>
                <p className="text-[10px] text-slate-500">{job.company}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AuthLayout({
  title,
  subtitle,
  tab,
  children,
}: {
  title: string;
  subtitle?: string;
  tab?: 'login' | 'signup';
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-deep lg:grid lg:grid-cols-2 lg:gap-4 lg:bg-white lg:p-4 dark:lg:bg-slate-950">
      <div className="flex min-h-screen flex-col lg:min-h-0 lg:items-center lg:justify-center lg:px-10 lg:py-10">
        <div className="relative overflow-hidden px-6 pt-6 pb-10 lg:hidden">
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
          <Link
            to="/"
            aria-label={t('common.back')}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
          </Link>
          <h1 className="relative mt-8 font-display text-3xl leading-tight font-semibold text-white">
            {title}
          </h1>
          {subtitle && <p className="relative mt-2 text-sm text-slate-400">{subtitle}</p>}
        </div>

        <main className="flex-1 rounded-t-[2rem] bg-white px-6 pt-6 pb-10 lg:w-full lg:max-w-sm lg:flex-none lg:rounded-none lg:p-0 dark:bg-slate-900 dark:lg:bg-slate-950">
          <div className="hidden lg:block">
            <Brand />
            <h1 className="mt-12 font-display text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {tab && (
            <div className="mb-6 lg:mt-8 lg:mb-0">
              <AuthTabs active={tab} />
            </div>
          )}
          <div className="space-y-5 lg:mt-8">{children}</div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden rounded-[2rem] bg-brand-600 lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
        <div className="absolute -top-16 -left-16 h-56 w-56 rotate-12 rounded-[3rem] border border-white/15" />
        <div className="absolute top-24 left-24 h-16 w-16 rotate-12 rounded-2xl bg-white/10" />
        <div className="absolute -right-20 -bottom-20 h-72 w-72 -rotate-12 rounded-[4rem] border border-white/15" />
        <div className="absolute right-16 bottom-40 h-20 w-20 rotate-45 rounded-3xl bg-white/10" />
        <div className="relative w-full max-w-lg">
          <DashboardMock />
          <div className="absolute -bottom-12 -left-10">
            <MatchCard
              label={t('landing.mock.matchLabel')}
              title={t('landing.mock.matchTitle')}
              company={t('landing.mock.matchCompany')}
            />
          </div>
        </div>
        <div className="relative mt-24 max-w-md text-center">
          <p className="font-display text-3xl leading-tight font-semibold text-white">
            {t('auth.panelTitle')}
          </p>
          <p className="mt-3 text-sm text-brand-100">{t('auth.panelText')}</p>
        </div>
      </aside>
    </div>
  );
}
