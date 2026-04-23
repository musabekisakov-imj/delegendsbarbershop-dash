import { cn } from '../ui/utils';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** "dashed" gives a more prominent first-time empty; "plain" is quieter for filtered-no-results */
  variant?: 'dashed' | 'plain';
  className?: string;
}

/**
 * Single empty-state pattern used across the app.
 * Replaces ~6 different ad-hoc empty-state JSX blocks scattered across pages.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'dashed',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl p-10 text-center',
        // Refactoring UI: pick ONE elevation metaphor per surface.
        //   - dashed → ghost/placeholder (no shadow, explicit dashed border)
        //   - plain  → real card surface (solid border, subtle shadow)
        variant === 'dashed'
          ? 'border-2 border-dashed border-border bg-muted/40'
          : 'border border-border bg-card shadow-sm',
        className,
      )}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
