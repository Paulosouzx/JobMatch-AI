import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<StatusTone, { badge: string; dot: string }> = {
  neutral: { badge: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
  primary: { badge: 'bg-primary/10 text-brand-600 dark:text-primary', dot: 'bg-primary' },
  info: { badge: 'bg-chart-2/10 text-chart-2', dot: 'bg-chart-2' },
  success: { badge: 'bg-success/10 text-success', dot: 'bg-success' },
  warning: { badge: 'bg-warning/15 text-warning', dot: 'bg-warning' },
  danger: { badge: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
};

export function StatusBadge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  const style = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        style.badge,
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden="true" />
      {children}
    </span>
  );
}
