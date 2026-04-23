import { cn } from './utils';

interface FilterChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

// Shared filter chip used across services, staff, clients, bookings.
// Pattern: rounded-full, bordered, swaps to inverted foreground/background when active.
export function FilterChip({ active, onClick, children, className }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border bg-card text-foreground hover:bg-accent',
        className,
      )}
    >
      {children}
    </button>
  );
}
