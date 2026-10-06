import { zodResolver } from '@hookform/resolvers/zod';
import { Download, Inbox, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/app/ConfirmDialog';
import { EmptyState } from '@/components/app/EmptyState';
import { FormField } from '@/components/app/FormField';
import { PageHeader } from '@/components/app/PageHeader';
import { StatCard } from '@/components/app/StatCard';
import { StatusBadge } from '@/components/app/StatusBadge';
import { ThemeMenu } from '@/components/app/ThemeMenu';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SAMPLE_DAYS = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(2026, 8, 7 + index);
  const collected = 120 + Math.round(60 * Math.sin(index / 3) + index * 2);
  return {
    date: date.toISOString().slice(0, 10),
    collected,
    matched: Math.round(collected * (0.08 + 0.04 * Math.cos(index / 4))),
  };
});

function RuleForm({ onDone }: { onDone?: () => void }) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(3, t('ui.sample.form.errors.name')),
        keyword: z.string().trim().min(1, t('ui.sample.form.errors.keyword')),
        mode: z.enum(['remote', 'hybrid', 'onsite'], { message: t('ui.sample.form.errors.mode') }),
        notify: z.boolean(),
        backfill: z.boolean(),
      }),
    [t],
  );
  type Values = z.infer<typeof schema>;
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { name: '', keyword: '', notify: true, backfill: false },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit() {
    await new Promise((resolve) => setTimeout(resolve, 400));
    toast.success(t('ui.sample.form.saved'));
    form.reset();
    onDone?.();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
      <FormField
        label={t('ui.sample.form.name')}
        description={t('ui.sample.form.nameHint')}
        error={errors.name?.message}
      >
        <Input placeholder="Frontend remoto" {...form.register('name')} />
      </FormField>
      <FormField label={t('ui.sample.form.keyword')} error={errors.keyword?.message}>
        <Input placeholder="react" {...form.register('keyword')} />
      </FormField>
      <Controller
        control={form.control}
        name="mode"
        render={({ field }) => (
          <FormField label={t('ui.sample.form.mode')} error={errors.mode?.message}>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                className="w-full"
                onBlur={field.onBlur}
                aria-invalid={errors.mode ? true : undefined}
              >
                <SelectValue placeholder={t('ui.sample.form.modePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">{t('profile.modes.remote')}</SelectItem>
                <SelectItem value="hybrid">{t('profile.modes.hybrid')}</SelectItem>
                <SelectItem value="onsite">{t('profile.modes.onsite')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        )}
      />
      <Controller
        control={form.control}
        name="notify"
        render={({ field }) => (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <Label htmlFor="rule-notify">{t('ui.sample.form.notify')}</Label>
            <Switch id="rule-notify" checked={field.value} onCheckedChange={field.onChange} />
          </div>
        )}
      />
      <Controller
        control={form.control}
        name="backfill"
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="rule-backfill"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
            <Label htmlFor="rule-backfill" className="font-normal">
              {t('ui.sample.form.accept')}
            </Label>
          </div>
        )}
      />
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t('ui.saving') : t('ui.sample.form.submit')}
        </Button>
      </div>
    </form>
  );
}

export default function DesignSystem() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'7' | '30'>('30');
  const [sheetOpen, setSheetOpen] = useState(false);
  const chartData = period === '7' ? SAMPLE_DAYS.slice(-7) : SAMPLE_DAYS;
  const chartConfig: ChartConfig = {
    collected: { label: t('ui.sample.collected'), color: 'var(--chart-3)' },
    matched: { label: t('ui.sample.matched'), color: 'var(--chart-1)' },
  };
  const trend = SAMPLE_DAYS.slice(-12).map((day) => day.matched);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader
        title={t('ui.sample.title')}
        description={t('ui.sample.description')}
        actions={
          <>
            <ThemeMenu />
            <Button variant="outline" size="sm">
              <Download />
              {t('ui.sample.export')}
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button size="sm">
                  <Plus />
                  {t('ui.sample.newItem')}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>{t('ui.sample.sheetTitle')}</SheetTitle>
                  <SheetDescription>{t('ui.sample.sheetDescription')}</SheetDescription>
                </SheetHeader>
                <div className="px-4">
                  <RuleForm onDone={() => setSheetOpen(false)} />
                </div>
                <SheetFooter />
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('ui.sample.kpis.matches')}
          value="38"
          change={12.4}
          changeLabel={t('ui.sample.kpis.vsLast')}
          trend={trend}
        />
        <StatCard
          label={t('ui.sample.kpis.scored')}
          value="412"
          change={-3.1}
          changeLabel={t('ui.sample.kpis.vsLast')}
          trend={SAMPLE_DAYS.slice(-12).map((day) => day.collected)}
          chartColor="var(--chart-3)"
        />
        <StatCard
          label={t('ui.sample.kpis.avgScore')}
          value="71"
          change={0}
          changeLabel={t('ui.sample.kpis.vsLast')}
        />
        <StatCard label={t('ui.sample.kpis.notified')} value="—" loading />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{t('ui.sample.chartTitle')}</CardTitle>
          <CardDescription>{t('ui.sample.chartDescription')}</CardDescription>
          <CardAction>
            <Tabs value={period} onValueChange={(value) => setPeriod(value as '7' | '30')}>
              <TabsList>
                <TabsTrigger value="7">{t('ui.sample.period7')}</TabsTrigger>
                <TabsTrigger value="30">{t('ui.sample.period30')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={chartData} margin={{ left: 4, right: 4 }}>
              <defs>
                <linearGradient id="fill-collected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-collected)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-collected)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fill-matched" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-matched)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-matched)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tickFormatter={(value: string) =>
                  new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                }
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Area
                dataKey="collected"
                type="monotone"
                stroke="var(--color-collected)"
                fill="url(#fill-collected)"
                strokeWidth={1.75}
              />
              <Area
                dataKey="matched"
                type="monotone"
                stroke="var(--color-matched)"
                fill="url(#fill-matched)"
                strokeWidth={1.75}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Tabs defaultValue="buttons" className="gap-6">
            <TabsList>
              <TabsTrigger value="buttons">{t('ui.sample.tabs.buttons')}</TabsTrigger>
              <TabsTrigger value="form">{t('ui.sample.tabs.form')}</TabsTrigger>
              <TabsTrigger value="states">{t('ui.sample.tabs.states')}</TabsTrigger>
              <TabsTrigger value="empty">{t('ui.sample.tabs.empty')}</TabsTrigger>
            </TabsList>

            <TabsContent value="buttons" className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>{t('ui.sample.buttons.primary')}</Button>
                <Button variant="secondary">{t('ui.sample.buttons.secondary')}</Button>
                <Button variant="outline">{t('ui.sample.buttons.outline')}</Button>
                <Button variant="ghost">{t('ui.sample.buttons.ghost')}</Button>
                <Button variant="link">{t('ui.sample.buttons.link')}</Button>
                <Button variant="outline" size="icon" aria-label={t('ui.sample.export')}>
                  <Download />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive">
                      <Trash2 />
                      {t('ui.sample.confirm.trigger')}
                    </Button>
                  }
                  title={t('ui.sample.confirm.title')}
                  description={t('ui.sample.confirm.description')}
                  confirmLabel={t('ui.sample.confirm.confirm')}
                  cancelLabel={t('ui.cancel')}
                  onConfirm={() => {
                    toast.success(t('ui.sample.confirm.done'));
                  }}
                />
                <Button variant="outline" onClick={() => toast(t('ui.sample.form.saved'))}>
                  Toast
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="form" className="max-w-md">
              <RuleForm />
            </TabsContent>

            <TabsContent value="states" className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="primary">{t('ui.sample.states.new')}</StatusBadge>
                <StatusBadge tone="success">{t('ui.sample.states.applied')}</StatusBadge>
                <StatusBadge tone="info">{t('ui.sample.states.saved')}</StatusBadge>
                <StatusBadge tone="warning">{t('ui.sample.states.pending')}</StatusBadge>
                <StatusBadge tone="danger">{t('ui.sample.states.error')}</StatusBadge>
                <StatusBadge tone="neutral">{t('ui.sample.states.discarded')}</StatusBadge>
              </div>
              <div className="space-y-3 rounded-lg border p-4">
                {Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="empty">
              <EmptyState
                icon={Inbox}
                title={t('ui.sample.empty.title')}
                description={t('ui.sample.empty.description')}
                action={<Button size="sm">{t('ui.sample.empty.action')}</Button>}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
