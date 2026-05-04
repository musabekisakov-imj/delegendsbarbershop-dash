'use client';

// Celebratory confirmation badge — used on /book/confirmation.
// Three layered animations:
//   1. An outer lime ring that scales 0 → 1 with spring (the "appearing" beat)
//   2. A solid lime disc fading in beneath it
//   3. A check-mark SVG path that draws itself via pathLength 0 → 1
//   4. Six small lime spark dots that burst outward and fade
//
// The whole thing fits in a square box you place where you want — defaults
// to ~96px so it reads as a clear hero element on the confirmation page.

import { motion } from 'framer-motion';
import { useId } from 'react';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  size?: number;
  className?: string;
}

export function ConfirmedBadge({ size = 96, className }: Props) {
  const ringId = useId();
  const sparkCount = 6;
  const sparkRadius = size * 0.95;

  return (
    <div
      role="presentation"
      style={{ width: size, height: size }}
      className={className}
    >
      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="overflow-visible"
        aria-hidden
      >
        {/* Outer ring — appears with a spring */}
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="oklch(0.95 0.16 118.89)"
          strokeWidth="2.5"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.05 }}
          style={{ transformOrigin: '50% 50%' }}
        />

        {/* Solid lime disc — fades in slightly after the ring */}
        <motion.circle
          cx="50"
          cy="50"
          r="38"
          fill="oklch(0.95 0.16 118.89)"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.18 }}
          style={{ transformOrigin: '50% 50%' }}
        />

        {/* Check stroke — draws itself */}
        <motion.path
          d="M 32 51 L 45 64 L 70 38"
          fill="none"
          stroke="oklch(0.10 0 0)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.55, delay: 0.42, ease: EASE }}
        />

        {/* Spark dots — burst outward and fade */}
        {Array.from({ length: sparkCount }).map((_, i) => {
          const angle = (Math.PI * 2 * i) / sparkCount - Math.PI / 2;
          const x = 50 + Math.cos(angle) * sparkRadius * 0.5;
          const y = 50 + Math.sin(angle) * sparkRadius * 0.5;
          return (
            <motion.circle
              key={`${ringId}-${i}`}
              cx="50"
              cy="50"
              r="2"
              fill="oklch(0.95 0.16 118.89)"
              initial={{ cx: 50, cy: 50, opacity: 0, scale: 1 }}
              animate={{ cx: x, cy: y, opacity: [0, 1, 0], scale: [1, 1.3, 0.4] }}
              transition={{ duration: 0.9, delay: 0.55 + i * 0.04, ease: EASE }}
            />
          );
        })}

        {/* Soft outer halo — subtle ring expanding past the badge */}
        <motion.circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke="oklch(0.95 0.16 118.89)"
          strokeWidth="1"
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 1.6, opacity: 0 }}
          transition={{ duration: 1.0, delay: 0.45, ease: EASE }}
          style={{ transformOrigin: '50% 50%' }}
        />
      </motion.svg>
    </div>
  );
}
