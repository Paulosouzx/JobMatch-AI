import { Radar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const MARK_SIZES = {
  sm: { box: 'size-8 rounded-lg', icon: 'size-4' },
  md: { box: 'size-9 rounded-xl', icon: 'size-5' },
  lg: { box: 'size-16 rounded-2xl', icon: 'size-8' },
};

export function BrandMark({
  size = 'md',
  inverted = false,
  className,
}: {
  size?: keyof typeof MARK_SIZES;
  inverted?: boolean;
  className?: string;
}) {
  const style = MARK_SIZES[size];
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center',
        style.box,
        inverted ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-brand-600 text-white',
        className,
      )}
      aria-hidden="true"
    >
      <Radar className={style.icon} strokeWidth={1.75} />
    </span>
  );
}

export function Wordmark({
  inverted = false,
  className,
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-display text-lg font-semibold tracking-tight',
        inverted ? 'text-white' : 'text-foreground',
        className,
      )}
    >
      JobMatch
      <span className={inverted ? 'text-brand-300' : 'text-brand-600 dark:text-brand-400'}>
        {' '}
        AI
      </span>
    </span>
  );
}

export function Brand({
  inverted = false,
  to = '/',
  size = 'md',
}: {
  inverted?: boolean;
  to?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <Link to={to} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="JobMatch AI">
      <BrandMark size={size} inverted={inverted} />
      <Wordmark inverted={inverted} className={size === 'sm' ? 'text-base' : undefined} />
    </Link>
  );
}
