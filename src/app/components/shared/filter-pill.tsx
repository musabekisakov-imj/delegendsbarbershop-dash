import type { ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { cn } from '../ui/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { STAFF_COLORS } from '../../lib/tokens';

type StaffColor = typeof STAFF_COLORS[number];

interface FilterPillProps {
  variant: 'meta' | 'staff' | 'status';
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;

  empty?: boolean;
  icon?: ReactNode;
  avatar?: { src?: string; fallback: string; color: StaffColor };
  dot?: string;
  fillColor?: string;
  groupId?: string;
  badgeTintClass?: string;
  iconColorClass?: string;
  hoverClass?: string;
  // Outer colored glow — inset top-shine is always appended automatically when selected.
  glowShadow?: string;
  ariaLabel?: string;
}

function selectedBgClass(variant: FilterPillProps['variant'], fillColor?: string, color?: StaffColor) {
  if (variant === 'meta') return 'bg-foreground';
  if (variant === 'staff' && color) return color.dot;
  if (variant === 'status' && fillColor) return fillColor;
  return 'bg-foreground';
}

// Snappy spring — close to native feel (250ms vs Tailwind's 150ms default).
const SPRING   = { type: 'spring' as const, bounce: 0.14, duration: 0.25 };
const SPRING_B = { type: 'spring' as const, bounce: 0.28, duration: 0.22 };

// Top-edge glass shine present on every selected pill.
const INSET_SHINE = 'inset 0 1px 0 rgba(255,255,255,0.22)';

export function FilterPill({
  variant, label, count, selected, onClick,
  empty, icon, avatar, dot, fillColor,
  groupId, badgeTintClass, iconColorClass, hoverClass, glowShadow, ariaLabel,
}: FilterPillProps) {
  const prefersReduced = useReducedMotion();
  const spring   = prefersReduced ? { type: 'tween' as const, duration: 0.01 } : SPRING;
  const springB  = prefersReduced ? { type: 'tween' as const, duration: 0.01 } : SPRING_B;
  const isMeta = variant === 'meta';
  const usesLayout = Boolean(groupId);
  const showBadge = selected || count > 0;

  const badgeClass = (() => {
    if (selected) return 'bg-white/25 text-white';
    if (badgeTintClass) return badgeTintClass;
    return 'bg-black/[0.08] dark:bg-white/10 text-foreground/60';
  })();

  const textColor = selected
    ? 'text-white'
    : isMeta
      ? 'text-foreground font-bold'
      : 'text-foreground font-medium';

  const boxShadow = selected
    ? [glowShadow, INSET_SHINE].filter(Boolean).join(', ')
    : '0 0 0 0 transparent';

  const leading = (() => {
    if (variant === 'meta') {
      return (
        <span className="inline-flex h-5 w-5 items-center justify-center shrink-0">
          {icon ?? <FunnelIcon className="h-4 w-4" />}
        </span>
      );
    }
    if (variant === 'staff' && avatar) {
      const c = avatar.color;
      return (
        <div className={cn('shrink-0 rounded-full', selected && 'p-[2px] bg-white/25')}>
          <Avatar className="h-7 w-7 block">
            {avatar.src && <AvatarImage src={avatar.src} alt={avatar.fallback} />}
            <AvatarFallback className={cn('text-[9px] font-bold', c.light, c.label)}>
              {avatar.fallback}
            </AvatarFallback>
          </Avatar>
        </div>
      );
    }
    if (variant === 'status') {
      if (icon) {
        return (
          <motion.span
            animate={{ scale: selected ? 1.08 : 1 }}
            transition={spring}
            className={cn(
              'ml-1 shrink-0 transition-colors duration-150',
              selected ? 'text-white/90' : (iconColorClass ?? 'text-muted-foreground'),
            )}
            aria-hidden
          >
            {icon}
          </motion.span>
        );
      }
      return (
        <motion.span
          animate={{ scale: selected ? 1.15 : 1 }}
          transition={spring}
          className={cn('h-2.5 w-2.5 rounded-full shrink-0 ml-1', selected ? 'bg-white/80' : dot)}
          aria-hidden
        />
      );
    }
    return null;
  })();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={ariaLabel ?? `${label} ${count}${selected ? ' selected' : ''}`}
      whileTap={!prefersReduced ? { scale: 0.93 } : {}}
      whileHover={!selected && !prefersReduced ? { scale: 1.03, transition: { duration: 0.12 } } : {}}
      transition={spring}
      animate={{ boxShadow }}
      className={cn(
        'relative inline-flex h-10 items-center gap-2 rounded-full whitespace-nowrap overflow-hidden',
        'cursor-pointer shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isMeta ? 'px-4 text-[13px]' : 'pl-1.5 pr-3.5 text-[13px]',
        empty && !selected && 'opacity-50',
        usesLayout
          ? selected
            ? 'border border-transparent'
            : cn('border border-transparent', hoverClass ?? 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]')
          : selected
            ? cn(
                'border border-transparent',
                variant === 'meta' ? 'bg-foreground' : '',
                variant === 'staff' && avatar ? avatar.color.dot : '',
                variant === 'status' && fillColor ? fillColor : '',
              )
            : cn('border border-transparent', hoverClass ?? 'hover:bg-black/[0.05] dark:hover:bg-white/[0.06]'),
        textColor,
      )}
    >
      {/* Shared layout background — slides between pills when groupId provided */}
      <AnimatePresence>
        {usesLayout && selected && (
          <motion.span
            key={groupId}
            layoutId={groupId}
            className={cn('absolute inset-0 rounded-full', selectedBgClass(variant, fillColor, avatar?.color))}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: prefersReduced ? 0.01 : 0.12 } }}
            transition={spring}
            style={{ zIndex: 0 }}
          />
        )}
      </AnimatePresence>

      <span className="relative z-10 inline-flex items-center gap-[7px]">
        {leading}
        <span className="tracking-[-0.012em]">{label}</span>
        <AnimatePresence mode="popLayout">
          {showBadge && (
            <motion.span
              key={`badge-${count}`}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={springB}
              className={cn(
                'rounded-[5px] min-w-[18px] h-[18px] flex items-center justify-center px-[5px]',
                'text-[11px] tabular-nums font-bold leading-none',
                badgeClass,
              )}
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
