import { cn } from '../ui/utils';
import { STATUS_PILL } from '../../lib/tokens';
import { useT } from '../../hooks/use-t';
import type { AppointmentStatus } from '../../types';
import type { TranslationKey } from '../../i18n';

// 'missed' is a derived display-only status — not stored in DB.
// It appears when endTime has passed but status is still scheduled/confirmed.
export type DerivedStatus = AppointmentStatus | 'missed';

const STATUS_TKEY: Record<DerivedStatus, TranslationKey> = {
  scheduled: 'status.scheduled',
  confirmed: 'status.confirmed',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  no_show:   'status.no_show',
  missed:    'status.missed',
};

const MISSED_CLS = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';

interface StatusPillProps {
  status: DerivedStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  const t = useT();
  const colorCls = status === 'missed' ? MISSED_CLS : STATUS_PILL[status as AppointmentStatus];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium tabular-nums',
        size === 'sm'
          ? 'px-1.5 py-0.5 text-[10px]'
          : 'px-2 py-0.5 text-[11px]',
        colorCls,
        className,
      )}
    >
      <span className={cn(
        'rounded-full shrink-0',
        size === 'sm' ? 'h-1 w-1' : 'h-1.5 w-1.5',
        status === 'scheduled' ? 'bg-slate-400'
          : status === 'confirmed' ? 'bg-emerald-500'
          : status === 'completed' ? 'bg-green-500'
          : status === 'cancelled' ? 'bg-rose-500'
          : status === 'no_show' ? 'bg-amber-500'
          : 'bg-amber-400',
      )} />
      {t(STATUS_TKEY[status])}
    </span>
  );
}
