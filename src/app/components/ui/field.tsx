import { Label } from './label';
import { cn } from './utils';

interface FieldProps {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

// Labeled form field wrapper — matches the styling used across clients, staff, bookings.
export function Field({ label, children, error, hint, required, className }: FieldProps) {
  return (
    <div className={className}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// Read-only display field — muted card with uppercase label + value.
export function Readonly({ label, children, className }: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border border-border bg-muted/30 px-3 py-2', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground break-words">{children}</p>
    </div>
  );
}
