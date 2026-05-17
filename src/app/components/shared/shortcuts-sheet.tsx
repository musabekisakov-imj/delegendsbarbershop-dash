import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useT } from '../../hooks/use-t';
import type { TranslationKey } from '../../i18n';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  labelKey: TranslationKey;
}

const GLOBAL: Shortcut[] = [
  { keys: ['⌘', 'K'], labelKey: 'header.shortcuts.globalSearch' },
  { keys: ['N'], labelKey: 'header.shortcuts.newBooking' },
  { keys: ['/'], labelKey: 'header.shortcuts.focusSearch' },
  { keys: ['?'], labelKey: 'header.shortcuts.showHelp' },
];

const NAVIGATION: Shortcut[] = [
  { keys: ['G', 'O'], labelKey: 'nav.overview' },
  { keys: ['G', 'A'], labelKey: 'nav.analytics' },
  { keys: ['G', 'C'], labelKey: 'nav.calendar' },
  { keys: ['G', 'B'], labelKey: 'nav.bookings' },
  { keys: ['G', 'L'], labelKey: 'nav.clients' },
  { keys: ['G', 'T'], labelKey: 'nav.staff' },
  { keys: ['G', 'S'], labelKey: 'nav.services' },
  { keys: ['G', 'P'], labelKey: 'nav.settings' },
  { keys: ['G', 'H'], labelKey: 'nav.help' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function Row({ shortcut, t }: { shortcut: Shortcut; t: ReturnType<typeof useT> }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{t(shortcut.labelKey)}</span>
      <div className="flex items-center gap-1">
        {shortcut.keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-muted-foreground">then</span>}
            <Kbd>{k}</Kbd>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ShortcutsSheet({ open, onOpenChange }: Props) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('header.shortcuts.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {t('header.shortcuts.general')}
            </p>
            <div className="divide-y divide-border">
              {GLOBAL.map(s => <Row key={s.labelKey} shortcut={s} t={t} />)}
            </div>
          </section>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {t('header.shortcuts.navigation')}
            </p>
            <div className="divide-y divide-border">
              {NAVIGATION.map(s => <Row key={s.labelKey} shortcut={s} t={t} />)}
            </div>
          </section>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            {t('header.shortcuts.tip')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
