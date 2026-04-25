import { cn } from '../ui/utils';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  /** Short uppercase eyebrow above the title — e.g., "No matches", "Start here" */
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /**
   * "dashed" → first-time / placeholder ("add your first client")
   * "plain"  → filtered no-results ("nothing matches your search")
   */
  variant?: 'dashed' | 'plain';
  className?: string;
}

/**
 * Single empty-state pattern — editorial family.
 *
 * Editorial treatment: the icon is plain (no tinted circle), eyebrow
 * sits above the title, dashed border for placeholders / solid for
 * filtered-no-results. No drop shadows. Same visual rhythm as the
 * editorial heroes elsewhere.
 */
export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  variant = 'dashed',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl px-6 py-12 text-center',
        variant === 'dashed'
          ? 'border border-dashed border-border bg-card'
          : 'border border-border bg-card',
        className,
      )}
    >
      <Icon className="h-10 w-10 text-muted-foreground/40" />
      {eyebrow && (
        <p className="mt-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
          {eyebrow}
        </p>
      )}
      <h3 className={cn(
        'text-base font-bold text-foreground',
        eyebrow ? 'mt-1' : 'mt-4',
      )}>
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
