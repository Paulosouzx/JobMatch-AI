import { X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export function TagInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  id,
  className,
  tone = 'neutral',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  id?: string;
  className?: string;
  tone?: 'neutral' | 'success' | 'danger';
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const parts = raw
      .split(/[,\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const seen = new Set(value.map((item) => item.toLowerCase()));
    const next = [...value];
    for (const part of parts) {
      if (!seen.has(part.toLowerCase())) {
        seen.add(part.toLowerCase());
        next.push(part);
      }
    }
    onChange(next);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  const chipTone =
    tone === 'success'
      ? 'bg-success/10 text-success ring-success/20'
      : tone === 'danger'
        ? 'bg-destructive/10 text-destructive ring-destructive/20'
        : 'bg-secondary text-secondary-foreground ring-border';

  return (
    <div
      className={cn(
        'flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 dark:bg-input/30',
        className,
      )}
      onClick={() => document.getElementById(inputId)?.focus()}
    >
      {value.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-md py-0.5 pr-1 pl-2 text-xs font-medium ring-1 ring-inset',
            chipTone,
          )}
        >
          {item}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange(value.filter((_, position) => position !== index));
            }}
            className="rounded-sm p-0.5 opacity-60 hover:bg-foreground/10 hover:opacity-100"
            aria-label={`Remover ${item}`}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={inputId}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => add(draft)}
        onPaste={(event) => {
          const text = event.clipboardData.getData('text');
          if (/[,\n]/.test(text)) {
            event.preventDefault();
            add(text);
          }
        }}
        placeholder={value.length === 0 ? placeholder : undefined}
        aria-label={ariaLabel}
        className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
