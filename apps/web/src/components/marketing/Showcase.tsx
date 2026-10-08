import { BellRing, Check, FileText, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScribbleVariant = 'loop' | 'swoop' | 'pulse' | 'hook';

const SCRIBBLES: Record<ScribbleVariant, { viewBox: string; path: string; head?: string }> = {
  loop: {
    viewBox: '0 0 220 200',
    path: 'M210 8c-6 54-22 98-58 124-26 19-58 22-74 8-14-12-6-36 14-34 22 2 22 34-2 54-22 18-56 22-80 16',
    head: 'M24 168l-14 8 14 8',
  },
  swoop: {
    viewBox: '0 0 200 90',
    path: 'M196 30c-34-20-74-24-112-12C52 28 30 46 12 70',
    head: 'M8 52l4 18 18-4',
  },
  pulse: {
    viewBox: '0 0 240 80',
    path: 'M4 60c18 0 22-40 40-40s20 34 36 34 18-50 38-50 22 46 40 46 20-22 36-22 18 12 40 12',
  },
  hook: {
    viewBox: '0 0 120 180',
    path: 'M70 4c-6 30 10 52 32 56 18 4 16-22-2-24-26-3-44 30-52 66-6 28-24 56-42 72',
    head: 'M2 160l4 18 18-6',
  },
};

export function Scribble({
  variant,
  className,
  strokeWidth = 3,
}: {
  variant: ScribbleVariant;
  className?: string;
  strokeWidth?: number;
}) {
  const shape = SCRIBBLES[variant];
  return (
    <svg
      viewBox={shape.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('pointer-events-none', className)}
      aria-hidden="true"
    >
      <path d={shape.path} />
      {shape.head && <path d={shape.head} />}
    </svg>
  );
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone =
    score >= 85
      ? 'bg-volt text-ink'
      : score >= 70
        ? 'bg-ink text-volt'
        : 'bg-slate-200 text-slate-700';
  return (
    <span
      className={cn(
        'inline-flex h-8 min-w-11 items-center justify-center rounded-full px-2.5 text-sm font-semibold tabular-nums',
        tone,
        className,
      )}
    >
      {score}
    </span>
  );
}

export interface ShowcaseJob {
  title: string;
  company: string;
  score: number;
}

export function PhoneMock({
  title,
  filters,
  jobs,
  discard,
  save,
  topLabel,
  className,
}: {
  title: string;
  filters: string[];
  jobs: ShowcaseJob[];
  discard: string;
  save: string;
  topLabel: string;
  className?: string;
}) {
  const [first, ...rest] = jobs;
  return (
    <div
      className={cn(
        'w-[280px] rounded-[2.4rem] bg-ink p-2.5 shadow-[0_40px_80px_-20px_rgba(15,17,12,0.45)]',
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.9rem] bg-white px-4 pt-5 pb-4 text-ink">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-slate-200" />
        <p className="font-display text-xl font-semibold">{title}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filters.map((filter) => (
            <span
              key={filter}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-medium text-slate-600"
            >
              {filter}
            </span>
          ))}
        </div>
        {first && (
          <div className="mt-4 rounded-2xl bg-ink p-3.5 text-white">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-volt">
                <Sparkles className="size-3" strokeWidth={2} />
                {topLabel}
              </span>
              <ScorePill score={first.score} className="h-7" />
            </div>
            <p className="mt-2 text-sm font-semibold">{first.title}</p>
            <p className="text-[11px] text-white/60">{first.company}</p>
            <svg viewBox="0 0 200 40" className="mt-2 h-8 w-full" aria-hidden="true">
              <path
                d="M0 32 L20 28 L36 30 L52 20 L70 24 L88 12 L104 18 L122 8 L140 14 L158 6 L176 10 L200 4"
                fill="none"
                stroke="#ddff4c"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {rest.map((job) => (
            <li
              key={job.title}
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{job.title}</p>
                <p className="truncate text-[10px] text-slate-500">{job.company}</p>
              </div>
              <ScorePill score={job.score} className="h-7 min-w-9 text-xs" />
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <span className="flex h-9 items-center justify-center gap-1 rounded-xl bg-coral text-xs font-semibold text-white">
            <X className="size-3.5" strokeWidth={2.25} />
            {discard}
          </span>
          <span className="flex h-9 items-center justify-center gap-1 rounded-xl bg-volt text-xs font-semibold text-ink">
            <Check className="size-3.5" strokeWidth={2.25} />
            {save}
          </span>
        </div>
      </div>
    </div>
  );
}

const WEEK = [12, 18, 15, 26, 22, 31, 28];

export function DarkChartCard({
  title,
  range,
  days,
  className,
}: {
  title: string;
  range: string;
  days: string[];
  className?: string;
}) {
  const max = Math.max(...WEEK);
  const points = WEEK.map(
    (value, index) => `${(index / (WEEK.length - 1)) * 100},${48 - (value / max) * 40}`,
  );
  return (
    <div
      className={cn(
        'w-[300px] rounded-3xl bg-ink p-5 text-white shadow-2xl shadow-ink/30',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/70">
          {range}
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
        152 <span className="text-sm font-medium text-volt">+18%</span>
      </p>
      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className="mt-3 h-24 w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="voltFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ddff4c" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ddff4c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,50 ${points.join(' ')} 100,50`} fill="url(#voltFill)" />
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#ddff4c"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-white/50">
        {days.map((day, index) => (
          <span key={index}>{day}</span>
        ))}
      </div>
    </div>
  );
}

export function AnalysisCard({
  label,
  title,
  company,
  score,
  haveLabel,
  missingLabel,
  have,
  missing,
  cta,
  className,
}: {
  label: string;
  title: string;
  company: string;
  score: number;
  haveLabel: string;
  missingLabel: string;
  have: string[];
  missing: string[];
  cta: string;
  className?: string;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className={cn(
        'w-full max-w-sm rounded-3xl bg-ink p-6 text-white shadow-2xl shadow-ink/30',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-volt px-3 py-1 text-[11px] font-semibold text-ink">
        <Sparkles className="size-3.5" strokeWidth={2} />
        {label}
      </span>
      <div className="mt-5 flex items-center gap-4">
        <div className="relative size-20 shrink-0">
          <svg viewBox="0 0 80 80" className="size-20 -rotate-90" aria-hidden="true">
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="none"
              stroke="#ddff4c"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - score / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold">
            {score}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-white/60">{company}</p>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-xs">
        <div>
          <p className="mb-1.5 text-white/50">{haveLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {have.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-volt/15 px-2.5 py-1 font-medium text-volt"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-white/50">{missingLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-coral/20 px-2.5 py-1 font-medium text-coral"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
      <span className="mt-6 flex h-10 items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-ink">
        <FileText className="size-4" strokeWidth={2} />
        {cta}
      </span>
    </div>
  );
}

export function NotificationCard({
  label,
  meta,
  title,
  company,
  score,
  className,
}: {
  label: string;
  meta: string;
  title: string;
  company: string;
  score: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex w-[290px] items-center gap-3 rounded-2xl bg-white p-3 pr-4 text-ink shadow-xl shadow-ink/15 ring-1 ring-ink/5',
        className,
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-volt">
        <BellRing className="size-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-semibold text-ink">{label}</span>
          {meta}
        </p>
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="truncate text-[10px] text-slate-500">{company}</p>
      </div>
      <ScorePill score={score} className="h-7 min-w-9 text-xs" />
    </div>
  );
}

export function BlobArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true">
      <path
        d="M110 18c30-14 72 4 80 40 8 38-20 74-58 78-32 4-56-18-58-48-2-32 12-58 36-70z"
        fill="#ddff4c"
      />
      <path d="M28 140c-14-36 4-82 40-96 30-12 58 8 60 40 2 28-14 50-40 56z" fill="#0f110c" />
      <path
        d="M132 70c10-18 34-16 36 0 2 18-24 26-30 10-4-12 12-24 26-16"
        fill="none"
        stroke="#0f110c"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GaugeArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true">
      <path
        d="M40 120a70 70 0 0 1 20-70"
        fill="none"
        stroke="#ff6b5b"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M70 40a70 70 0 0 1 60-10"
        fill="none"
        stroke="#ddff4c"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M142 34a70 70 0 0 1 40 40"
        fill="none"
        stroke="#0f110c"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M78 110l18-16 14 10 24-26 14 8 18-22"
        fill="none"
        stroke="#0f110c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M154 64h12v12"
        fill="none"
        stroke="#0f110c"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SourceBadge({ name }: { name: string }) {
  return (
    <li className="rounded-full border border-slate-200 px-5 py-2.5 font-display text-lg font-semibold tracking-tight text-slate-500 transition hover:border-ink hover:bg-volt hover:text-ink dark:border-white/15 dark:text-slate-300 dark:hover:border-volt">
      {name}
    </li>
  );
}
