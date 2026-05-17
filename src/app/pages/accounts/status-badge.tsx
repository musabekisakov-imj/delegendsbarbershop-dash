import { LockClosedIcon } from '@heroicons/react/24/outline';
import { cn } from '../../components/ui/utils';
import type { AccountStatus } from '../../types';

interface StatusBadgeProps {
  status: AccountStatus;
  size?: 'sm' | 'md';
  labels: { active: string; invited: string; disabled: string };
}

export function StatusBadge({ status, size = 'md', labels }: StatusBadgeProps) {
  const base = cn(
    'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.14em]',
    size === 'sm' ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-[10px]',
  );

  if (status === 'active') {
    return (
      <span className={cn(base, 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400')}>
        <span className="h-1 w-1 rounded-full bg-emerald-500" />
        {labels.active}
      </span>
    );
  }
  if (status === 'invited') {
    return (
      <span className={cn(base, 'border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400')}>
        <span className="h-1 w-1 rounded-full bg-amber-500" />
        {labels.invited}
      </span>
    );
  }
  return (
    <span className={cn(base, 'border border-border bg-muted/40 text-muted-foreground')}>
      <LockClosedIcon className="h-2.5 w-2.5" />
      {labels.disabled}
    </span>
  );
}
