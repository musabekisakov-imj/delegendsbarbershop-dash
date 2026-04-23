import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Shortcut {
  keys: string[];
  label: string;
}

const GLOBAL: Shortcut[] = [
  { keys: ['⌘', 'K'], label: 'Global search' },
  { keys: ['N'], label: 'New booking' },
  { keys: ['/'], label: 'Focus search on page' },
  { keys: ['?'], label: 'Show this help' },
];

const NAVIGATION: Shortcut[] = [
  { keys: ['G', 'O'], label: 'Overview' },
  { keys: ['G', 'C'], label: 'Calendar' },
  { keys: ['G', 'B'], label: 'Bookings' },
  { keys: ['G', 'L'], label: 'Clients' },
  { keys: ['G', 'T'], label: 'Staff' },
  { keys: ['G', 'S'], label: 'Services' },
  { keys: ['G', 'P'], label: 'Settings' },
  { keys: ['G', 'H'], label: 'Help' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-semibold text-foreground shadow-sm">
      {children}
    </kbd>
  );
}

function Row({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-foreground">{shortcut.label}</span>
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">General</p>
            <div className="divide-y divide-border">
              {GLOBAL.map(s => <Row key={s.label} shortcut={s} />)}
            </div>
          </section>
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Go to…</p>
            <div className="divide-y divide-border">
              {NAVIGATION.map(s => <Row key={s.label} shortcut={s} />)}
            </div>
          </section>
          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Tip: shortcuts are ignored while typing in form fields — except <Kbd>/</Kbd> when focus is in a search input.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
