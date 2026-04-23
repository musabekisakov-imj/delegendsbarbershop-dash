import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { cn } from '../components/ui/utils';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Wrap the app in <ConfirmProvider> once; then call `const confirm = useConfirm()`
// from any component and `await confirm({...})` — returns true/false.
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // If a previous confirm is still pending (e.g. rapid double-click on a
    // destructive action), resolve it to false so the caller doesn't await
    // forever. The new confirm takes over the UI.
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    // Snapshot + null before calling to be re-entrancy safe: if the resolve
    // callback synchronously schedules another confirm, it won't see a stale
    // resolver.current and double-resolve this one.
    const r = resolver.current;
    resolver.current = null;
    setState(null);
    r?.(value);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={!!state} onOpenChange={(open) => { if (!open) handleConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConfirm(false)}>
              {state?.cancelLabel ?? 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirm(true)}
              className={cn(
                state?.destructive &&
                  'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/40',
              )}
            >
              {state?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
