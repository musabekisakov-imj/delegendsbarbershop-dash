import { cn } from './utils';

interface IconButtonProps {
  onClick: (e: React.MouseEvent) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: 'default' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

// Compact icon-only button with hover tint. Default = neutral, danger = rose.
export function IconButton({
  onClick, icon: Icon, label, variant = 'default', size = 'md', disabled = false, className,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-7 w-7' : 'h-8 w-8',
        variant === 'danger'
          ? 'hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 dark:hover:border-rose-800/60'
          : 'hover:bg-accent hover:text-foreground hover:border-foreground/20',
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </button>
  );
}
