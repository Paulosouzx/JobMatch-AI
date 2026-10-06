import { Bot, CircleCheck, Clock, Quote, Sparkles } from 'lucide-react';

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={5}
          className="fill-none stroke-brand-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - score / 100)}
          className="fill-none stroke-brand-600"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">
        {score}
      </span>
    </div>
  );
}

const BARS: [number, number][] = [
  [80, 45],
  [65, 30],
  [90, 70],
  [70, 50],
  [95, 80],
  [60, 25],
  [75, 55],
];

export function MiniBars({ days, tall = false }: { days: string[]; tall?: boolean }) {
  return (
    <div className={`flex items-end gap-2 ${tall ? 'h-40' : 'h-24'}`}>
      {BARS.map(([total, matched], index) => (
        <div key={index} className="flex h-full flex-1 flex-col items-center gap-1.5">
          <div className="relative w-full max-w-5 flex-1 overflow-hidden rounded-full bg-brand-100">
            <div
              className="absolute inset-x-0 bottom-0 rounded-full bg-brand-300"
              style={{ height: `${total}%` }}
            />
            <div
              className="absolute inset-x-0 bottom-0 rounded-full bg-brand-600"
              style={{ height: `${matched}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400">{days[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function MatchCard({
  label,
  title,
  company,
  className = 'w-64',
}: {
  label: string;
  title: string;
  company: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/10 ring-1 ring-slate-900/5`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </span>
      <div className="mt-3 flex items-center gap-3">
        <ScoreRing score={92} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{company}</p>
        </div>
      </div>
    </div>
  );
}

export function ProgressCard({
  title,
  meta,
  className = 'w-60',
}: {
  title: string;
  meta: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/10 ring-1 ring-slate-900/5`}
    >
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100">
        <div className="h-full w-4/5 rounded-full bg-brand-600" />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <CircleCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          {meta}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
          2h
        </span>
      </div>
    </div>
  );
}

export function ChartCard({
  title,
  range,
  days,
  className = 'w-64',
}: {
  title: string;
  range: string;
  days: string[];
  className?: string;
}) {
  return (
    <div
      className={`${className} rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/10 ring-1 ring-slate-900/5`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500">
          {range}
        </span>
      </div>
      <MiniBars days={days} />
    </div>
  );
}

export function QuoteCard({
  text,
  author,
  role,
  className = 'w-72',
}: {
  text: string;
  author: string;
  role: string;
  className?: string;
}) {
  return (
    <div
      className={`${className} rounded-2xl bg-white p-4 shadow-xl shadow-brand-950/10 ring-1 ring-slate-900/5`}
    >
      <Quote className="h-5 w-5 text-accent" strokeWidth={1.75} />
      <p className="mt-2 text-xs leading-relaxed text-slate-700">{text}</p>
      <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <Bot className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div>
          <p className="text-xs font-semibold text-slate-900">{author}</p>
          <p className="text-[10px] text-slate-500">{role}</p>
        </div>
      </div>
    </div>
  );
}
