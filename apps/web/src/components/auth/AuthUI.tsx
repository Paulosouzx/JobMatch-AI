import { Eye, EyeOff, GitFork, type LucideIcon } from 'lucide-react';
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { translateAuthError } from '../../lib/auth-errors';
import { config } from '../../lib/config';
import { supabase } from '../../lib/supabase';

export function IconField({
  icon: Icon,
  label,
  trailing,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: LucideIcon;
  label: string;
  trailing?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition focus-within:border-brand-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800/60 dark:focus-within:bg-slate-800">
      <Icon className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className="block text-[11px] font-medium text-slate-500 dark:text-slate-400"
        >
          {label}
        </label>
        <input
          id={id}
          {...props}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
        />
      </div>
      {trailing}
    </div>
  );
}

export function PasswordField({
  icon,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: LucideIcon; label: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const Toggle = visible ? EyeOff : Eye;
  return (
    <IconField
      {...props}
      icon={icon}
      label={label}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          className="rounded-lg p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <Toggle className="h-5 w-5" strokeWidth={1.75} />
        </button>
      }
    />
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-volt text-sm font-semibold text-ink shadow-lg shadow-brand-600/15 transition hover:bg-volt/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    />
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-slate-400">
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      {label}
      <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

export function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  const { t } = useTranslation();
  const base = 'flex-1 rounded-xl py-2.5 text-center text-sm font-medium transition';
  const on = 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white';
  const off = 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white';
  return (
    <div className="flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
      <Link
        to="/login"
        className={`${base} ${active === 'login' ? on : off}`}
        aria-current={active === 'login' ? 'page' : undefined}
      >
        {t('auth.tabLogin')}
      </Link>
      <Link
        to="/signup"
        className={`${base} ${active === 'signup' ? on : off}`}
        aria-current={active === 'signup' ? 'page' : undefined}
      >
        {t('auth.tabSignup')}
      </Link>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export function OAuthButtons({
  redirectPath,
  onError,
}: {
  redirectPath: string;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const providers = [
    config.googleOAuth ? ('google' as const) : null,
    config.githubOAuth ? ('github' as const) : null,
  ].filter((provider): provider is 'google' | 'github' => provider !== null);
  if (providers.length === 0) return null;

  async function start(provider: 'google' | 'github') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) onError(translateAuthError(error.message));
  }

  return (
    <div className={`grid gap-3 ${providers.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {providers.map((provider) => (
        <SecondaryButton key={provider} type="button" onClick={() => void start(provider)}>
          {provider === 'google' ? (
            <GoogleIcon />
          ) : (
            <GitFork className="h-4 w-4" strokeWidth={1.75} />
          )}
          {provider === 'google' ? t('auth.withGoogle') : 'GitHub'}
        </SecondaryButton>
      ))}
    </div>
  );
}
