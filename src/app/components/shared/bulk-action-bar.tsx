import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { MOTION_DUR, MOTION_EASE } from '../../lib/tokens';

export interface BulkAction {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface BulkActionBarProps {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  selectedLabel?: string;
}

export function BulkActionBar({ count, actions, onClear, selectedLabel = 'selected' }: BulkActionBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 64, opacity: 0 }}
          transition={{ duration: MOTION_DUR.base, ease: MOTION_EASE }}
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 shadow-lg ring-1 ring-black/5 dark:ring-white/5 min-w-max">
            {/* Count badge */}
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground tabular-nums pr-1">
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold px-1.5">
                {count}
              </span>
              {selectedLabel}
            </span>

            <span className="h-5 w-px bg-border mx-1 shrink-0" aria-hidden />

            {/* Actions */}
            {actions.map(action => (
              <button
                key={action.key}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
                  action.danger
                    ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                {action.icon}
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}

            <span className="h-5 w-px bg-border mx-0.5 shrink-0" aria-hidden />

            {/* Clear */}
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              aria-label="Clear selection"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
