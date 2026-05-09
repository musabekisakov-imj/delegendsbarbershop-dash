import { useEffect } from 'react';
import {
  PlusCircleIcon,
  LockClosedIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';
import { useNavigate } from 'react-router';

interface QuickAction {
  key: string;
  labelKey: 'overview.actions.newBooking' | 'overview.actions.blockTime' | 'overview.actions.openCalendar' | 'overview.actions.findClient';
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

const ACTIONS: QuickAction[] = [
  { key: 'new-booking',   labelKey: 'overview.actions.newBooking',   shortcut: 'N', icon: PlusCircleIcon,       href: '/bookings/new' },
  { key: 'block-time',    labelKey: 'overview.actions.blockTime',    shortcut: 'B', icon: LockClosedIcon,       href: '/calendar' },
  { key: 'open-calendar', labelKey: 'overview.actions.openCalendar', shortcut: 'C', icon: CalendarDaysIcon,     href: '/calendar' },
  { key: 'find-client',   labelKey: 'overview.actions.findClient',   shortcut: 'F', icon: MagnifyingGlassIcon,  href: '/clients' },
];

interface QuickActionsProps {
  className?: string;
}

export function QuickActions({ className }: QuickActionsProps) {
  const t = useT();
  const navigate = useNavigate();

  useEffect(() => {
    const SHORTCUT_MAP: Record<string, string> = { n: '/bookings/new', b: '/calendar', c: '/calendar', f: '/clients' };
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const href = SHORTCUT_MAP[e.key.toLowerCase()];
      if (href) { e.preventDefault(); navigate(href); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-4', className)}>
      {ACTIONS.map(({ key, labelKey, shortcut, icon: Icon, href }) => (
        <button
          key={key}
          type="button"
          onClick={() => navigate(href)}
          className="group relative flex items-center gap-2.5 rounded-xl bg-muted/50 px-3.5 py-3 text-left transition-colors hover:bg-accent active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="flex-1 text-xs font-medium text-foreground leading-tight">
            {t(labelKey)}
          </span>
          <kbd className="shrink-0 hidden sm:inline-flex items-center justify-center rounded bg-muted px-1.5 text-[10px] font-medium text-muted-foreground tabular-nums">
            {shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}
