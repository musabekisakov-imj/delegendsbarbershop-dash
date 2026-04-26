'use client';

// Magicui-style horizontal marquee.
// Uses --duration and --gap CSS custom properties (set per instance via
// className or inline style). The animation comes from globals.css /
// tailwind.config.ts (animate-marquee). Repeats children N times so the
// loop appears seamless even with short content.

import * as React from 'react';
import { cn } from '@/lib/cn';

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pause animation when the user hovers over the marquee. */
  pauseOnHover?: boolean;
  /** How many times to repeat the children for a seamless loop. Default 4. */
  repeat?: number;
  /** Reverse the scroll direction. */
  reverse?: boolean;
  /** Vertical scroll instead of horizontal. */
  vertical?: boolean;
  children: React.ReactNode;
}

export function Marquee({
  className,
  pauseOnHover = false,
  repeat = 4,
  reverse = false,
  vertical = false,
  children,
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      className={cn(
        'group flex overflow-hidden p-2 [--duration:30s] [--gap:2rem]',
        vertical ? 'flex-col' : 'flex-row',
        className,
      )}
      // Outer-flex gap so the seam between repeated rows shows the same
      // spacing as siblings within a row. Without this, the last item of
      // row 1 visually glues into the first item of row 2.
      style={{ gap: 'var(--gap)' }}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex shrink-0',
            vertical ? 'animate-marquee-vertical flex-col' : 'animate-marquee flex-row',
            pauseOnHover && 'group-hover:[animation-play-state:paused]',
            reverse && '[animation-direction:reverse]',
          )}
          style={{ gap: 'var(--gap)' }}
          aria-hidden={i > 0}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
