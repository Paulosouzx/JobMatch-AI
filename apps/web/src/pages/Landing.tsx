import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ScoreBadge, ThemeToggle } from '../components/ui';
import { useAuth } from '../lib/auth';
import { config } from '../lib/config';
import { useTheme } from '../lib/theme';

interface TitledText {
  title: string;
  text: string;
}

function PreviewCard({
  title,
  company,
  score,
  reason,
}: {
  title: string;
  company: string;
  score: number;
  reason: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-sm text-slate-500">{company}</p>
        </div>
        <ScoreBadge score={score} />
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{reason}</p>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { dark, toggle } = useTheme();
  const steps = t('landing.steps', { returnObjects: true }) as TitledText[];
  const highlights = t('landing.highlights', { returnObjects: true }) as TitledText[];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-lg font-bold text-indigo-600">JobMatch AI</span>
        <nav className="flex items-center gap-2">
          <ThemeToggle dark={dark} onToggle={toggle} label={t('common.theme')} />
          <a
            href={config.repoUrl}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('common.github')}
          </a>
          <Link
            to={session ? '/app' : '/login'}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            {session ? t('landing.dashboard') : t('landing.login')}
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            {t('landing.heroTitle')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
            {t('landing.heroText')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {session ? (
              <Link
                to="/app"
                className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
              >
                {t('landing.dashboard')}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white hover:bg-indigo-500"
                >
                  {t('landing.login')}
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg border border-slate-300 px-6 py-3 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  {t('landing.signup')}
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">{t('landing.howTitle')}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-slate-50 py-12 dark:bg-slate-900/50">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold">{t('landing.highlightsTitle')}</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">{t('landing.previewTitle')}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3" aria-hidden="true">
            <PreviewCard
              title="Senior TypeScript Engineer"
              company="Acme"
              score={92}
              reason="Stack quase idêntica ao teu CV e 100% remoto."
            />
            <PreviewCard
              title="Full-stack Developer"
              company="Globex"
              score={78}
              reason="Boa aderência. Falta experiência com GraphQL."
            />
            <PreviewCard
              title="Frontend Lead"
              company="Initech"
              score={64}
              reason="Nível de liderança acima do teu perfil atual."
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">{t('landing.previewNote')}</p>
        </section>

        <section id="self-hosting" className="mx-auto max-w-4xl px-4 py-12 text-center">
          <h2 className="text-2xl font-semibold">{t('landing.selfHostTitle')}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
            {t('landing.selfHostText')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={config.repoUrl}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900"
            >
              {t('landing.repo')}
            </a>
            <a
              href={`${config.repoUrl}#readme`}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              {t('landing.readme')}
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500 dark:border-slate-800">
        {t('landing.footer')}{' '}
        <a href={config.repoUrl} className="text-indigo-600 hover:underline">
          GitHub
        </a>
      </footer>
    </div>
  );
}
