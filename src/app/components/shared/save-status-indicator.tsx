import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { useT } from '../../hooks/use-t';
import type { AutoSaveStatus } from '../../hooks/use-auto-save';

interface SaveStatusIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Header chip showing auto-save state. Five states:
 *
 *   idle      — nothing rendered (clean slate)
 *   saving    — spinner + "Saving…"
 *   saved     — ✓ + "All changes saved" (fades to "Saved · 2s ago" then hides
 *               after 30s)
 *   error     — ⚠ + "Couldn't save · Retry" (clickable)
 *   offline   — cloud-off + "Offline · Will save when connected"
 *
 * All copy via i18n (`saveStatus.*`).
 */
export function SaveStatusIndicator({
  status, lastSavedAt, onRetry, className,
}: SaveStatusIndicatorProps) {
  const t = useT();
  const [visible, setVisible] = useState(true);

  // After a saved status sits idle for 30s, fade to nothing — keeps the
  // header chrome calm during long editing sessions.
  useEffect(() => {
    if (status !== 'saved') {
      setVisible(true);
      return;
    }
    const id = window.setTimeout(() => setVisible(false), 30_000);
    return () => window.clearTimeout(id);
  }, [status, lastSavedAt]);

  if (status === 'idle' || (status === 'saved' && !visible)) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.18 }}
        className={cn(
          'inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums',
          status === 'saving' && 'text-muted-foreground',
          status === 'saved' && 'text-emerald-700 dark:text-emerald-400',
          status === 'error' && 'text-rose-700 dark:text-rose-400',
          status === 'offline' && 'text-amber-700 dark:text-amber-400',
          className,
        )}
      >
        {status === 'saving' && (
          <>
            <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
            <span>{t('saveStatus.saving')}</span>
          </>
        )}
        {status === 'saved' && (
          <>
            <CheckCircleIcon className="h-3.5 w-3.5" />
            <span>{t('saveStatus.saved')}</span>
          </>
        )}
        {status === 'error' && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 hover:underline focus:outline-none"
          >
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            <span>{t('saveStatus.errorRetry')}</span>
          </button>
        )}
        {status === 'offline' && (
          <>
            <CloudIcon className="h-3.5 w-3.5" />
            <span>{t('saveStatus.offline')}</span>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
