import { cn } from './utils';

// Shared KPI tile used by overview + analytics.
// Flat surface, colored icon badge, label + value + optional sub.
// Replaces the big gradient stat cards and the analytics-specific `Kpi` local component.

const TONE = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400' },
} as const;

interface KpiTileProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: keyof typeof TONE;
  className?: string;
}

export function KpiTile({
  label, value, sub, icon: Icon, tone = 'blue', className,
}: KpiTileProps) {
  const t = TONE[tone];
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', t.bg)}>
          <Icon className={cn('h-5 w-5', t.text)} />
        </div>
      </div>
    </div>
  );
}
