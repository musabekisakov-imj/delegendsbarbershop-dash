'use client';

// Avatar stack — overlapping circular portraits with lime border.
// Adapted from the source pattern's AvatarStack but fed by real staff
// from the public API. No avatarUrl in seed → AvatarFallback shows
// initials over a deterministic gradient hashed from staff.id.

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { gradientFor } from '@/lib/tokens';
import { cn } from '@/lib/cn';
import type { PublicStaff } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  staff: PublicStaff[];
  /** Limit to the first N staff (default 5 to match the source pattern). */
  max?: number;
  /** Override default avatar size. Default size-13 like the pattern. */
  size?: string;
  className?: string;
}

export function AvatarStack({ staff, max = 5, size = 'size-13', className }: Props) {
  const visible = staff.slice(0, max);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
      }}
      className={cn('flex -space-x-3', className)}
    >
      {visible.map((s, i) => {
        const initials = `${s.firstName[0] ?? ''}${s.lastName[0] ?? ''}`.toUpperCase();
        return (
          <motion.div
            key={s.id}
            variants={{
              hidden: { opacity: 0, scale: 0.85, y: 8 },
              show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
            }}
            style={{ zIndex: visible.length - i }}
          >
            <Avatar className={cn(size, 'border-2 border-primary')}>
              {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={`${s.firstName} ${s.lastName}`} />}
              <AvatarFallback
                className={cn(
                  'text-foreground text-xs font-semibold tabular bg-gradient-to-br',
                  gradientFor(s.id),
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
