import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import {
  useId,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

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
      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
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
