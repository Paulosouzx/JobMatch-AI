import { Skeleton } from '@/components/ui/skeleton';

export function PageFallback() {
  return (
    <div className="space-y-6" role="status" aria-busy="true">
      <div className="space-y-2 border-b pb-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
