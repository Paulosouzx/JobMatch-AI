import { useTranslation } from 'react-i18next';
import { BrandMark, Wordmark } from '@/components/marketing/Brand';
import { cn } from '@/lib/utils';

export function RadarPulse({ className }: { className?: string }) {
  return (
    <div className={cn('relative flex size-28 items-center justify-center', className)}>
      <span className="absolute inset-0 rounded-full border border-brand-500/20" />
      <span className="absolute inset-4 rounded-full border border-brand-500/25" />
      <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/10 [animation-duration:2s]" />
      <span
        className="absolute inset-0 animate-spin rounded-full [animation-duration:2.4s]"
        style={{
          background:
            'conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--brand-500) 35%, transparent) 50deg, transparent 90deg)',
        }}
      />
      <BrandMark size="lg" className="relative shadow-lg shadow-brand-600/25" />
    </div>
  );
}

export function AppLoader({ fullScreen = true }: { fullScreen?: boolean }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-6 bg-background',
        fullScreen ? 'fixed inset-0 z-50' : 'min-h-[50vh] w-full',
      )}
    >
      <RadarPulse />
      <div className="flex flex-col items-center gap-3">
        <Wordmark />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-[loader-slide_1.2s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    </div>
  );
}
