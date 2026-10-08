import {
  ArrowDown,
  ArrowRight,
  BellRing,
  BookOpen,
  CodeXml,
  Funnel,
  GitFork,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Brand } from '../components/marketing/Brand';
import {
  AnalysisCard,
  BlobArt,
  DarkChartCard,
  GaugeArt,
  NotificationCard,
  PhoneMock,
  Scribble,
  SourceBadge,
  type ShowcaseJob,
} from '../components/marketing/Showcase';
import { ThemeToggle } from '../components/legacy-ui';
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
  matchTitle: string;
  matchCompany: string;
  chartTitle: string;
  chartRange: string;
  days: string[];
  quoteAuthor: string;
}

interface ShowcaseCopy {
  phoneTitle: string;
  filters: string[];
  discard: string;
  save: string;
  notification: string;
  notificationMeta: string;
  analysisLabel: string;
  have: string;
  missing: string;
  skillsHave: string[];
  skillsMissing: string[];
  coverLetter: string;
  rules: string[];
}

const FEATURE_ICONS: LucideIcon[] = [Wallet, CodeXml, KeyRound, UserCheck, ShieldCheck, BellRing];
const STEP_ICONS: LucideIcon[] = [Search, Funnel, Sparkles, BellRing];
const SOURCES = [
  'Remotive',
  'Arbeitnow',
  'RemoteOK',
  'Net-Empregos',
  'Greenhouse',
  'Lever',
  'Adzuna',
  'ITJobs.pt',
];

const btnInk =
  'inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink dark:bg-volt dark:text-ink dark:hover:bg-volt/90 dark:focus-visible:outline-volt';
const btnInkOnVolt =
  'inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';
const btnVolt =
  'inline-flex items-center gap-2 rounded-full bg-volt px-5 py-3 text-sm font-semibold text-ink transition hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-volt';
const btnGhostLight =
  'inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/70';
const sectionTitle = 'font-display text-4xl font-semibold tracking-tight sm:text-5xl';

export default function Landing() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { dark, toggle } = useTheme();
  const features = t('landing.features', { returnObjects: true }) as TitledText[];
  const steps = t('landing.steps', { returnObjects: true }) as TitledText[];
  const cards = t('landing.cards', { returnObjects: true }) as TitledText[];
  const faq = t('landing.faq', { returnObjects: true }) as Faq[];
  const mock = t('landing.mock', { returnObjects: true }) as Mock;
  const showcase = t('landing.showcase', { returnObjects: true }) as ShowcaseCopy;
  const jobs = t('auth.panelJobs', { returnObjects: true }) as ShowcaseJob[];
  const primaryTarget = session ? '/app' : '/signup';
  const primaryLabel = session ? t('landing.dashboard') : t('landing.start');
  const navLinks = [
    { href: '#recursos', label: t('landing.nav.features') },
    { href: '#como-funciona', label: t('landing.nav.how') },
    { href: '#faq', label: t('landing.nav.faq') },
    { href: '#self-hosting', label: t('landing.nav.selfHost') },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-ink dark:bg-ink dark:text-white">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur dark:bg-ink/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Brand accent />
          <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex dark:text-slate-300">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-ink dark:hover:text-volt"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle dark={dark} onToggle={toggle} label={t('common.theme')} />
            {!session && (
              <Link
                to="/login"
                className="hidden rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-ink transition hover:border-ink sm:inline-flex dark:border-white/15 dark:text-white dark:hover:border-white"
              >
                {t('landing.login')}
              </Link>
            )}
            <Link to={session ? '/app' : '/signup'} className={`${btnInk} py-2`}>
              {session ? t('landing.dashboard') : t('landing.signup')}
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="relative">
            <div className="relative overflow-hidden rounded-[2.25rem] bg-volt px-6 pt-12 pb-16 text-ink sm:px-12 sm:pt-16 lg:w-[68%] lg:pb-24">
              <Scribble
                variant="loop"
                className="absolute top-10 right-6 hidden h-48 w-52 text-ink sm:block lg:right-10"
              />
              <h1 className="relative max-w-xl font-display text-5xl leading-[1.02] font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                {t('landing.heroTitle')}
                <Sparkles
                  className="ml-3 inline size-9 align-top sm:size-11"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </h1>
              <p className="relative mt-6 max-w-md text-base leading-relaxed text-ink/80 sm:text-lg">
                {t('landing.heroText')}
              </p>
              <div className="relative mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link to={primaryTarget} className={btnInkOnVolt}>
                  {primaryLabel}
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
                <Scribble variant="swoop" className="hidden h-12 w-32 text-ink sm:block" />
              </div>
              <a
                href="#como-funciona"
                className="relative mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-ink/80 hover:text-ink"
              >
                {t('landing.howLink')}
                <ArrowDown className="size-4" strokeWidth={2} />
              </a>
            </div>

            <div
              className="relative mt-[-3rem] flex justify-center gap-4 sm:mt-[-4rem] lg:absolute lg:top-10 lg:right-0 lg:mt-0 lg:w-[46%] lg:justify-end"
              aria-hidden="true"
            >
              <DarkChartCard
                title={mock.chartTitle}
                range={mock.chartRange}
                days={mock.days}
                className="absolute top-24 -right-4 hidden rotate-[4deg] xl:block"
              />
              <PhoneMock
                title={showcase.phoneTitle}
                filters={showcase.filters}
                jobs={jobs}
                discard={showcase.discard}
                save={showcase.save}
                topLabel={showcase.notification}
                className="relative -rotate-[3deg] lg:mr-48 xl:mr-56"
              />
            </div>
          </div>
        </section>

        <section
          id="recursos"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 pt-24 sm:px-6 lg:pt-32"
        >
          <h2 className={`${sectionTitle} max-w-md`}>{t('landing.mostTitle')}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="relative flex min-h-64 overflow-hidden rounded-[2rem] bg-slate-100 p-8 dark:bg-white/5"
              >
                <div className="relative z-10 max-w-[60%]">
                  <h3 className="font-display text-2xl font-semibold">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {card.text}
                  </p>
                  <a
                    href="#como-funciona"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                  >
                    {t('landing.readMore')}
                    <ArrowRight className="size-4" strokeWidth={2} />
                  </a>
                </div>
                {index === 0 ? (
                  <BlobArt className="absolute right-0 bottom-0 w-48 sm:w-60 dark:[&_path:nth-child(2)]:fill-white" />
                ) : (
                  <GaugeArt className="absolute -right-2 bottom-2 w-48 sm:w-60 dark:[&_path:nth-child(3)]:stroke-white dark:[&_path:nth-child(4)]:stroke-white dark:[&_path:nth-child(5)]:stroke-white" />
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div>
              <h2 className={sectionTitle}>{t('landing.whyTitle')}</h2>
              <p className="mt-5 text-slate-600 dark:text-slate-300">{t('landing.whyText')}</p>
              <a href={config.repoUrl} className={`${btnInk} mt-8`}>
                <GitFork className="size-4" strokeWidth={2} />
                {t('landing.whyCta')}
              </a>
            </div>
            <ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {features.map((feature, index) => {
                const Icon = FEATURE_ICONS[index] ?? Sparkles;
                return (
                  <li key={feature.title} className="flex gap-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-volt text-ink">
                      <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-semibold">{feature.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                        {feature.text}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className={`${sectionTitle} text-center text-3xl sm:text-4xl`}>
            {t('landing.sourcesTitle')}
          </h2>
          <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-3">
            {SOURCES.map((source) => (
              <SourceBadge key={source} name={source} />
            ))}
          </ul>

          <div className="relative mt-20 overflow-hidden rounded-[2rem] bg-ink px-6 py-12 text-white sm:px-12 sm:py-14 dark:bg-ink-soft dark:ring-1 dark:ring-white/10">
            <Scribble
              variant="pulse"
              className="absolute top-1/2 -left-6 hidden h-20 w-60 -translate-y-1/2 text-white/80 lg:block"
            />
            <div className="relative grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:pl-56">
              <div>
                <h2 className="max-w-lg font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  {t('landing.pulseTitle')}
                </h2>
                <p className="mt-4 max-w-lg text-white/70">{t('landing.pulseText')}</p>
                <Link to={primaryTarget} className={`${btnVolt} mt-8`}>
                  {primaryLabel}
                  <ArrowRight className="size-4" strokeWidth={2} />
                </Link>
              </div>
              <div className="flex flex-col gap-3" aria-hidden="true">
                {jobs.slice(0, 3).map((job, index) => (
                  <NotificationCard
                    key={job.title}
                    label={showcase.notification}
                    meta={showcase.notificationMeta}
                    title={job.title}
                    company={job.company}
                    score={job.score}
                    className={index === 1 ? 'lg:-ml-8' : index === 2 ? 'lg:ml-4' : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative flex justify-center lg:justify-start" aria-hidden="true">
              <div className="absolute top-20 left-10 h-72 w-80 rounded-[2rem] bg-volt sm:left-24" />
              <AnalysisCard
                label={showcase.analysisLabel}
                title={mock.matchTitle}
                company={mock.matchCompany}
                score={92}
                haveLabel={showcase.have}
                missingLabel={showcase.missing}
                have={showcase.skillsHave}
                missing={showcase.skillsMissing}
                cta={showcase.coverLetter}
                className="relative -rotate-2"
              />
            </div>
            <div>
              <h2 className={sectionTitle}>{t('landing.insightTitle')}</h2>
              <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-300">
                {t('landing.insightText')}
              </p>
              <p className="mt-6 text-xs text-slate-400">{t('landing.illustrative')}</p>
            </div>
          </div>

          <div className="mt-28 grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className={sectionTitle}>{t('landing.statTitle')}</h2>
              <p className="mt-5 max-w-lg text-slate-600 dark:text-slate-300">
                {t('landing.statText')}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {showcase.rules.map((rule) => (
                  <li
                    key={rule}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-white/20"
                  >
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-h-80" aria-hidden="true">
              <div className="absolute top-6 right-0 size-64 rounded-full bg-volt sm:size-80" />
              <Scribble
                variant="hook"
                className="absolute top-0 left-4 h-44 w-28 text-ink dark:text-white"
              />
              <div className="relative flex flex-col items-end gap-3 pt-10 pr-6 sm:pr-16">
                {jobs.map((job, index) => (
                  <NotificationCard
                    key={job.title}
                    label={showcase.notification}
                    meta={showcase.notificationMeta}
                    title={job.title}
                    company={job.company}
                    score={job.score}
                    className={index === 1 ? 'mr-10' : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 bg-slate-50 py-24 lg:py-32 dark:bg-white/[0.03]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <h2 className={`${sectionTitle} max-w-2xl`}>{t('landing.howTitle')}</h2>
            <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Sparkles;
                return (
                  <li
                    key={step.title}
                    className="relative rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-200 dark:bg-ink-soft dark:ring-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-full bg-volt text-ink">
                        <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                      </span>
                      <span className="font-display text-4xl font-semibold text-slate-200 dark:text-white/15">
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

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6 lg:py-32">
          <h2 className={`${sectionTitle} text-center`}>{t('landing.faqTitle')}</h2>
          <div className="mt-12 space-y-3">
            {faq.map((item, index) => (
              <details
                key={item.q}
                open={index === 0}
                className="group rounded-3xl bg-slate-100 px-6 py-5 dark:bg-white/5"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white transition group-open:rotate-45 group-open:bg-volt group-open:text-ink dark:bg-white/10">
                    <Plus className="size-4" strokeWidth={2} />
                  </span>
                </summary>
                <p className="mt-3 pr-12 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="self-hosting"
          className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-24 text-center sm:px-6"
        >
          <Scribble variant="hook" className="mx-auto h-36 w-24 text-ink dark:text-white" />
          <h2 className={`${sectionTitle} mx-auto mt-4 max-w-2xl`}>{t('landing.finalTitle')}</h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-600 dark:text-slate-300">
            {t('landing.finalText')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={primaryTarget} className={btnInk}>
              {primaryLabel}
              <ArrowRight className="size-4" strokeWidth={2} />
            </Link>
            <a
              href={config.repoUrl}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold transition hover:border-ink dark:border-white/20 dark:hover:border-white"
            >
              <GitFork className="size-4" strokeWidth={2} />
              {t('landing.repo')}
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-white dark:bg-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
          <div>
            <Brand inverted accent />
            <p className="mt-4 max-w-xs text-sm text-white/60">{t('landing.footer')}</p>
          </div>
          <nav aria-label={t('landing.footerCols.product')}>
            <p className="text-sm font-semibold">{t('landing.footerCols.product')}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              {navLinks.slice(0, 3).map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-volt">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={t('landing.footerCols.account')}>
            <p className="text-sm font-semibold">{t('landing.footerCols.account')}</p>
            <ul className="mt-4 space-y-2.5 text-sm text-white/60">
              <li>
                <Link to="/login" className="hover:text-volt">
                  {t('landing.login')}
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-volt">
                  {t('landing.signup')}
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <p className="text-sm font-semibold">{t('landing.selfHostTitle')}</p>
            <p className="mt-4 text-sm text-white/60">{t('landing.selfHostText')}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={config.repoUrl} className={`${btnVolt} py-2`}>
                <GitFork className="size-4" strokeWidth={2} />
                GitHub
              </a>
              <a href={`${config.repoUrl}#readme`} className={`${btnGhostLight} py-2`}>
                <BookOpen className="size-4" strokeWidth={2} />
                {t('landing.readme')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
