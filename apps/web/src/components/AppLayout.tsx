import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useTheme } from '../lib/theme';
import { ThemeToggle } from './ui';

const LINKS = [
  { to: '/app', key: 'nav.jobs', end: true },
  { to: '/app/profile', key: 'nav.profile', end: false },
  { to: '/app/settings', key: 'nav.settings', end: false },
  { to: '/app/runs', key: 'nav.runs', end: false },
];

export function AppLayout() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <NavLink to="/" className="font-bold text-brand-600">
            JobMatch AI
          </NavLink>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 ${isActive ? 'bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`
                }
              >
                {t(link.key)}
              </NavLink>
            ))}
            <ThemeToggle dark={dark} onToggle={toggle} label={t('common.theme')} />
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg px-3 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('nav.logout')}
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
