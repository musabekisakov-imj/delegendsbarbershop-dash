import type React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '../ui/utils';

export interface StaffCardColor {
  dot: string;   // bg-* Tailwind class for the bottom accent bar
  light: string; // bg-* for avatar fallback background
  label: string; // text-* for avatar fallback text
}

interface StaffCardBaseProps {
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  count: number;
  color: StaffCardColor;
  onClick?: () => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
}

interface GridVariantProps extends StaffCardBaseProps {
  variant: 'grid';
  focused?: boolean;
  loadDot?: string;
}

interface WeekVariantProps extends StaffCardBaseProps {
  variant: 'week';
  active?: boolean;
}

export type StaffCardProps = GridVariantProps | WeekVariantProps;

export function StaffCard(props: StaffCardProps) {
  const { staff, count, color, onClick, className, style, title } = props;
  const initials = `${staff.firstName[0]}${staff.lastName[0]}`;
  const isClickable = !!onClick;

  if (props.variant === 'grid') {
    const { focused, loadDot } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        style={style}
        className={cn(
          'group relative flex flex-1 items-center gap-3 px-3.5 py-3 transition-colors text-left',
          'hover:bg-accent/40 focus-visible:outline-none focus-visible:bg-accent/40',
          focused && 'bg-accent/30',
          className,
        )}
      >
        <Avatar className="h-9 w-9 shrink-0">
          {staff.avatarUrl && <AvatarImage src={staff.avatarUrl} alt={`${staff.firstName} ${staff.lastName}`} />}
          <AvatarFallback className={cn('text-xs font-bold', color.light, color.label)}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-foreground truncate flex-1 leading-tight tracking-tight">
          {staff.firstName}
        </span>
        <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border bg-card/60 pl-1.5 pr-2 py-1">
          {loadDot && <span className={cn('h-1.5 w-1.5 rounded-full transition-colors', loadDot)} aria-hidden />}
          <span className="text-[13px] font-bold tabular-nums leading-none text-foreground">{count}</span>
        </span>
        <span
          className={cn('absolute inset-x-3 bottom-0', color.dot, focused ? 'h-0.5' : 'h-px')}
          aria-hidden
        />
      </button>
    );
  }

  // variant === 'week' — portrait avatar card (avatar centered + name below)
  // Active state: colored top-accent line + staff-tinted background ring.
  // Inactive: ghost card, hover lifts to accent.
  const { active } = props;
  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      title={title ?? `${staff.firstName} ${staff.lastName}`}
      style={style}
      className={cn(
        'group relative flex flex-col items-center gap-1.5 rounded-xl px-3 pt-3 pb-2.5 w-full transition-all duration-150 overflow-hidden',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
        active
          ? 'bg-accent/60 border border-border shadow-sm'
          : cn(
              'bg-transparent border border-transparent',
              isClickable
                ? 'hover:bg-accent/30 hover:border-border/60 cursor-pointer'
                : 'cursor-default',
            ),
        className,
      )}
    >
      {/* Colored top-accent stripe — visible only when active */}
      {active && (
        <span
          className={cn('absolute inset-x-0 top-0 h-[3px] rounded-t-xl', color.dot)}
          aria-hidden
        />
      )}

      {/* Avatar — ring when active, tinted with staff color */}
      <span className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-150',
        active
          ? cn('ring-2 ring-offset-1 ring-offset-accent/60', color.dot.replace('bg-', 'ring-'))
          : 'ring-0',
      )}>
        <Avatar className="h-9 w-9 shrink-0">
          {staff.avatarUrl && <AvatarImage src={staff.avatarUrl} alt={`${staff.firstName} ${staff.lastName}`} />}
          <AvatarFallback className={cn('text-xs font-bold', color.light, color.label)}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </span>

      {/* Name */}
      <span className={cn(
        'text-[11px] font-semibold truncate w-full text-center leading-tight tracking-tight',
        active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
      )}>
        {staff.firstName}
      </span>

      {/* Appointment count badge */}
      <span className={cn(
        'text-[10px] tabular-nums font-medium leading-none',
        active ? 'text-muted-foreground' : 'text-muted-foreground/60',
      )}>
        {count}
      </span>
    </button>
  );
}
