import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BookOpen,
  Funnel,
  GitFork,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
  CodeXml,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Brand } from '../components/marketing/Brand';
import {
  ChartCard,
  MatchCard,
  MiniBars,
  ProgressCard,
  QuoteCard,
  ScoreRing,
} from '../components/marketing/Mockups';
import { ThemeToggle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { config } from '../lib/config';
import { useTheme } from '../lib/theme';

interface TitledText {
  title: string;
  text: string;
}

interface Faq {
  q: string;
  a: string;
}

interface Mock {
  matchLabel: string;
  matchTitle: string;
  matchCompany: string;
  progressTitle: string;
  progressMeta: string;
  chartTitle: string;
  chartRange: string;
  days: string[];
  quote: string;
  quoteAuthor: string;
  quoteRole: string;
}

const FEATURE_ICONS: LucideIcon[] = [Wallet, CodeXml, KeyRound, UserCheck, ShieldCheck, BellRing];
const STEP_ICONS: LucideIcon[] = [Search, Funnel, Sparkles, BellRing];
const SOURCES = ['Remotive', 'Arbeitnow', 'RemoteOK', 'Greenhouse', 'Lever', 'Adzuna', 'ITJobs.pt'];

const pillPrimary =
  'inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';
const pillOutline =
  'inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:border-slate-900 dark:border-slate-700 dark:text-white dark:hover:border-white';

function IconBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-900 dark:bg-brand-950/50 dark:text-brand-300">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { dark, toggle } = useTheme();
  const features = t('landing.features', { returnObjects: true }) as TitledText[];
  const steps = t('landing.steps', { returnObjects: true }) as TitledText[];
  const faq = t('landing.faq', { returnObjects: true }) as Faq[];
  const mock = t('landing.mock', { returnObjects: true }) as Mock;
  const primaryTarget = session ? '/app' : '/signup';
  const primaryLabel = session ? t('landing.dashboard') : t('landing.start');

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-transparent bg-white/80 backdrop-blur dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex dark:text-slate-300">
            <a href="#como-funciona" className="hover:text-brand-600">
              {t('landing.nav.how')}
            </a>
            <a href="#recursos" className="hover:text-brand-600">
              {t('landing.nav.features')}
            </a>
            <a href="#faq" className="hover:text-brand-600">
              {t('landing.nav.faq')}
            </a>
            <a href="#self-hosting" className="hover:text-brand-600">
              {t('landing.nav.selfHost')}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggle} label={t('common.theme')} />
            {!session && (
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-700 hover:text-brand-600 sm:inline-flex dark:text-slate-200"
              >
                {t('landing.login')}
              </Link>
            )}
            <Link to={session ? '/app' : '/login'} className={pillPrimary}>
              {session ? t('landing.dashboard') : t('landing.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:pt-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t('landing.badge')}
          </span>
          <h1 className="mt-6 max-w-4xl font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {t('landing.heroTitle')}
          </h1>

          <div className="relative mt-10 overflow-hidden rounded-[2rem] bg-deep dark:ring-1 dark:ring-white/10">
            <div className="absolute right-0 bottom-0 hidden h-3/4 w-1/2 rounded-tl-[2.5rem] bg-brand-600 lg:block" />
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
            <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-2 lg:p-12">
              <div className="flex flex-col justify-between gap-10">
                <div>
                  <p className="max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
                    {t('landing.heroText')}
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link to={primaryTarget} className={pillPrimary}>
                      {primaryLabel}
                      <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                    </Link>
                    {!session && (
                      <Link
                        to="/login"
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:border-white/60"
                      >
                        {t('landing.login')}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="inline-flex w-fit items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-lg">
                  <div className="flex -space-x-2">
                    {['R', 'A', 'G', 'L'].map((letter, index) => (
                      <span
                        key={letter}
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-semibold ${['bg-brand-100 text-brand-700', 'bg-amber-100 text-amber-700', 'bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700'][index]}`}
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="font-display text-lg leading-none font-semibold text-slate-900">
                      {t('landing.sourcesStat')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{t('landing.sourcesStatText')}</p>
                  </div>
                </div>
              </div>

              <div className="grid items-start gap-4 sm:grid-cols-2" aria-hidden="true">
                <div className="space-y-4">
                  <MatchCard
                    className="w-full"
                    label={mock.matchLabel}
                    title={mock.matchTitle}
                    company={mock.matchCompany}
                  />
                  <ProgressCard
                    className="hidden w-full sm:block"
                    title={mock.progressTitle}
                    meta={mock.progressMeta}
                  />
                </div>
                <div className="space-y-4 sm:pt-12">
                  <ChartCard
                    className="hidden w-full sm:block"
                    title={mock.chartTitle}
                    range={mock.chartRange}
                    days={mock.days}
                  />
                  <QuoteCard
                    className="w-full"
                    text={mock.quote}
                    author={mock.quoteAuthor}
                    role={mock.quoteRole}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-100 py-10 dark:border-slate-900">
          <div className="mx-auto max-w-6xl px-4">
            <p className="text-center text-xs font-medium tracking-wider text-slate-500 uppercase">
              {t('landing.sourcesTitle')}
            </p>
            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {SOURCES.map((source) => (
                <li
                  key={source}
                  className="font-display text-xl font-semibold tracking-tight text-slate-400 dark:text-slate-600"
                >
                  {source}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="recursos" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:py-28">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {t('landing.whyTitle')}
            </h2>
            <div>
              <p className="text-slate-600 dark:text-slate-300">{t('landing.whyText')}</p>
              <a href={config.repoUrl} className={`${pillPrimary} mt-6`}>
                {t('landing.whyCta')}
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
              </a>
            </div>
          </div>
          <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <li
                key={feature.title}
                className="rounded-3xl border border-slate-200 p-6 transition hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100 dark:border-slate-800 dark:hover:border-brand-800 dark:hover:shadow-none"
              >
                <IconBadge icon={FEATURE_ICONS[index] ?? Sparkles} />
                <h3 className="mt-5 font-display text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 bg-slate-50 py-20 sm:py-28 dark:bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {t('landing.howTitle')}
            </h2>
            <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Sparkles;
                return (
                  <li
                    key={step.title}
                    className="relative rounded-3xl bg-white p-6 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <IconBadge icon={Icon} />
                      <span className="font-display text-4xl font-semibold text-slate-200 dark:text-slate-800">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 font-display text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {step.text}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div
              className="relative rounded-[2rem] bg-brand-50 p-6 sm:p-10 dark:bg-brand-950/30"
              aria-hidden="true"
            >
              <div className="rounded-2xl bg-white p-5 shadow-xl shadow-brand-950/5 ring-1 ring-slate-900/5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">{mock.chartTitle}</p>
                  <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
                    {mock.chartRange}
                  </span>
                </div>
                <div className="mt-4">
                  <MiniBars days={mock.days} tall />
                </div>
              </div>
              <div className="-mt-10 ml-auto w-fit sm:-mr-6">
                <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/10 ring-1 ring-slate-900/5">
                  <ScoreRing score={92} size={56} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{mock.matchTitle}</p>
                    <p className="text-xs text-slate-500">{mock.matchCompany}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                {t('landing.insightTitle')}
              </h2>
              <p className="mt-5 text-slate-600 dark:text-slate-300">{t('landing.insightText')}</p>
              <Link to={primaryTarget} className={`${pillOutline} mt-8`}>
                {primaryLabel}
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
              <p className="mt-6 text-xs text-slate-400">{t('landing.illustrative')}</p>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 pb-20 sm:pb-28">
          <h2 className="text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {t('landing.faqTitle')}
          </h2>
          <div className="mt-12 space-y-3">
            {faq.map((item, index) => (
              <details
                key={item.q}
                open={index === 0}
                className="group rounded-2xl border border-slate-200 px-5 py-4 open:border-brand-400 dark:border-slate-800 dark:open:border-brand-700"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 transition group-open:rotate-45 group-open:border-brand-600 group-open:bg-brand-600 group-open:text-white dark:border-slate-700">
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section id="self-hosting" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
          <div className="relative overflow-hidden rounded-[2rem] bg-deep px-6 py-14 text-center sm:px-12 dark:ring-1 dark:ring-white/10">
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-accent/40 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {t('landing.selfHostTitle')}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-300">{t('landing.selfHostText')}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a href={config.repoUrl} className={pillPrimary}>
                  <GitFork className="h-4 w-4" strokeWidth={1.75} />
                  {t('landing.repo')}
                </a>
                <a
                  href={`${config.repoUrl}#readme`}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:border-white/60"
                >
                  <BookOpen className="h-4 w-4" strokeWidth={1.75} />
                  {t('landing.readme')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 dark:border-slate-900">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Brand />
          <p className="text-sm text-slate-500">{t('landing.footer')}</p>
          <a
            href={config.repoUrl}
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300"
          >
            <GitFork className="h-4 w-4" strokeWidth={1.75} />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
