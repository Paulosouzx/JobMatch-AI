import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Area, AreaChart } from 'recharts';
import { Card } from '@/components/ui/card';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  change,
  changeLabel,
  trend,
  loading = false,
  chartColor = 'var(--chart-1)',
}: {
  label: string;
  value: React.ReactNode;
  change?: number | null;
  changeLabel?: string;
  trend?: number[];
  loading?: boolean;
  chartColor?: string;
}) {
  if (loading) {
    return (
      <Card className="gap-3 p-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-10 w-full" />
      </Card>
    );
  }

  const direction =
    change === undefined || change === null
      ? 'none'
      : change > 0
        ? 'up'
        : change < 0
          ? 'down'
          : 'flat';
  const ChangeIcon =
    direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const data = (trend ?? []).map((point, index) => ({ index, point }));
  const config: ChartConfig = { point: { label, color: chartColor } };
  const gradientId = `stat-${label.replace(/\W+/g, '-')}`;

  return (
    <Card className="gap-0 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
          {direction !== 'none' && (
            <p
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-xs font-medium tabular-nums',
                direction === 'up' && 'text-success',
                direction === 'down' && 'text-destructive',
                direction === 'flat' && 'text-muted-foreground',
              )}
            >
              <ChangeIcon className="size-3.5" aria-hidden="true" />
              {change! > 0 ? '+' : ''}
              {change!.toFixed(1)}%
              {changeLabel && (
                <span className="font-normal text-muted-foreground">{changeLabel}</span>
              )}
            </p>
          )}
        </div>
        {data.length > 1 && (
          <ChartContainer config={config} className="aspect-auto h-12 w-28" aria-hidden="true">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-point)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--color-point)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="point"
                type="monotone"
                stroke="var(--color-point)"
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </Card>
  );
}
