import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FormField({
  label,
  description,
  error,
  children,
  className,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  children: ReactElement<Record<string, unknown>>;
  className?: string;
}) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;
  const describedBy = [description ? descriptionId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const control = isValidElement(children)
    ? cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })
    : children;

  return (
    <div className={cn('grid content-start gap-2', className)}>
      <Label htmlFor={id} className={cn(error && 'text-destructive')}>
        {label}
      </Label>
      {control}
      {description && !error && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
