import { motion } from 'motion/react';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';

export type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
  layoutId?: string;
}

const VIEWS: { key: ViewMode; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'grid', Icon: Squares2X2Icon },
  { key: 'list', Icon: ListBulletIcon },
];

export function ViewToggle({
  value,
  onChange,
  layoutId = 'view-toggle-indicator',
}: ViewToggleProps) {
  return (
    <div
      className="relative inline-flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
      role="group"
      aria-label="View mode"
    >
      {VIEWS.map(({ key, Icon }) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-pressed={active}
            aria-label={key === 'grid' ? 'Grid view' : 'List view'}
            className={cn(
              'relative z-10 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-md bg-card shadow-sm"
                transition={{ duration: MOTION_DUR.fast, ease: MOTION_EASE }}
              />
            )}
            <Icon className="relative z-10 h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
