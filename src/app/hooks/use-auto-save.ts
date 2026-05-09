import { useEffect, useRef, useState, useCallback } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface UseAutoSaveOptions<T> {
  /** Debounce window in ms before firing the save. Default 600. */
  debounceMs?: number;
  /** Custom equality fn — default is JSON.stringify comparison. */
  equals?: (a: T, b: T) => boolean;
}

interface UseAutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  /** Clear an `error` state and retry the most recent value. */
  retry: () => void;
}

const defaultEquals = <T,>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Debounced auto-save with offline awareness.
 *
 * Compares incoming `value` against the last successfully-saved snapshot.
 * On change: status → `saving`, debounce, call `save(value)`. On success:
 * `saved` + record timestamp. On rejection: `error`, expose `retry()`.
 *
 * Listens to `navigator.onLine` + online/offline events. While offline,
 * the latest value is queued and surfaces as `offline` status. On reconnect
 * the queue drains.
 */
export function useAutoSave<T>(
  value: T,
  save: (v: T) => Promise<void>,
  options: UseAutoSaveOptions<T> = {},
): UseAutoSaveResult {
  const { debounceMs = 600, equals = defaultEquals } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // Refs that hold mutable state without triggering re-renders.
  const lastSavedRef = useRef<T>(value);            // last value the server accepted
  const pendingRef = useRef<T | null>(null);         // queued value to save
  const timerRef = useRef<number | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  // Online/offline listeners — surface offline state immediately so the user
  // sees "Will save when connected" instead of a phantom "saving" forever.
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Core save runner. Splits out so it can be called from the debounce
  // handler AND from the online-reconnect drain AND from `retry()`.
  const runSave = useCallback(async (v: T) => {
    setStatus('saving');
    try {
      await saveRef.current(v);
      lastSavedRef.current = v;
      pendingRef.current = null;
      setStatus('saved');
      setLastSavedAt(new Date());
    } catch {
      // Keep the pending value queued so retry() can re-run with it.
      pendingRef.current = v;
      setStatus('error');
    }
  }, []);

  // Reactive debounce. Each render compares the incoming `value` against the
  // last-saved snapshot — if different, schedule a save after debounceMs.
  useEffect(() => {
    if (equals(value, lastSavedRef.current)) return;

    pendingRef.current = value;

    if (!isOnline) {
      setStatus('offline');
      return;
    }

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      runSave(value);
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, equals, debounceMs, isOnline, runSave]);

  // Drain the queue when we reconnect. Only fires when there's a pending
  // value AND we transitioned from offline → online.
  useEffect(() => {
    if (isOnline && pendingRef.current !== null && status === 'offline') {
      runSave(pendingRef.current);
    }
  }, [isOnline, status, runSave]);

  const retry = useCallback(() => {
    if (pendingRef.current !== null) {
      runSave(pendingRef.current);
    }
  }, [runSave]);

  return { status, lastSavedAt, retry };
}
