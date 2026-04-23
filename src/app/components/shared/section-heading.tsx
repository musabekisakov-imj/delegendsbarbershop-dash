import { cn } from '../ui/utils';

/**
 * Refactoring UI §"Hierarchy is Everything":
 *   Section titles should feel lighter than page titles, heavier than body,
 *   and distinct from values. This component owns that single pattern so
 *   pages can't invent their own with 5 different `font-semibold` variants.
 *
 *   - title    → the label for a section (e.g. "Weekly Revenue")
 *   - subtitle → the supporting one-line description (kept muted, no bold)
 *   - action   → optional right-aligned button / link
 *   - size     → "default" for chart panels, "sm" for dense cards
 */
interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  size?: 'default' | 'sm';
  className?: string;
}

const TITLE_CLASS = {
  default: 'text-base font-bold tracking-tight text-foreground',
  sm:      'text-sm font-bold tracking-tight text-foreground',
} as const;

const SUBTITLE_CLASS = {
  default: 'mt-0.5 text-sm text-muted-foreground',
  sm:      'mt-0.5 text-xs text-muted-foreground',
} as const;

export function SectionHeading({
  title,
  subtitle,
  action,
  size = 'default',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3',
        subtitle ? 'mb-5' : 'mb-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className={TITLE_CLASS[size]}>{title}</h3>
        {subtitle && <p className={SUBTITLE_CLASS[size]}>{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Label-Value pair — the Refactoring UI "de-emphasize the label, emphasize the value" pattern.
 * Useful inside cards, dialogs, and info rows.
 *
 *   label → uppercase tracking-wider muted
 *   value → tabular-nums, bold
 */
export function LabelValue({
  label,
  value,
  size = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  size?: 'default' | 'sm';
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className={cn(
        'font-semibold uppercase tracking-wider text-muted-foreground',
        size === 'sm' ? 'text-[10px]' : 'text-[11px]',
      )}>{label}</p>
      <p className={cn(
        'mt-0.5 tabular-nums font-bold text-foreground truncate',
        size === 'sm' ? 'text-sm' : 'text-base',
      )}>{value}</p>
    </div>
  );
}
