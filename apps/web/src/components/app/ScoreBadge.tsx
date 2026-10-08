import { cn } from '@/lib/utils';

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 80
      ? 'bg-success/10 text-success ring-success/20'
      : score >= 60
        ? 'bg-primary/10 text-brand-600 dark:text-primary ring-primary/20'
        : 'bg-muted text-muted-foreground ring-border';
  return (
    <span
      className={cn(
        'inline-flex h-7 min-w-11 items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums ring-1 ring-inset',
        tone,
        className,
      )}
      aria-label={`Score ${score}`}
    >
      {score}
    </span>
  );
}
