import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';

interface ShopStatusProps {
  state: 'open' | 'closed' | 'opens-later';
  closesAt?: string;
  opensAt?: string;
}

export function ShopStatus({ state, closesAt, opensAt }: ShopStatusProps) {
  const t = useT();

  const config = {
    open: {
      dot: 'bg-emerald-500',
      pill: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
      label: closesAt ? `${t('shop_status.open')} ${closesAt}` : t('shop_status.open'),
    },
    closed: {
      dot: 'bg-zinc-400',
      pill: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
      label: t('shop_status.closed'),
    },
    'opens-later': {
      dot: 'bg-blue-500',
      pill: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
      label: opensAt ? `${t('shop_status.opensAt')} ${opensAt}` : t('shop_status.opensAt'),
    },
  }[state];

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium', config.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} aria-hidden />
      {config.label}
    </span>
  );
}
