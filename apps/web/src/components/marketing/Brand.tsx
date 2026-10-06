import { Radar } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5" aria-label="JobMatch AI">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${inverted ? 'bg-white/10 text-white ring-1 ring-white/20' : 'bg-brand-600 text-white'}`}
      >
        <Radar className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span
        className={`font-display text-lg font-semibold tracking-tight ${inverted ? 'text-white' : 'text-slate-900 dark:text-white'}`}
      >
        JobMatch<span className="text-brand-600 dark:text-brand-400"> AI</span>
      </span>
    </Link>
  );
}
