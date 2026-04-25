'use client';

// Reusable page header — eyebrow + display title + optional sub.
// Animated entrance via Framer (page transitions are wired at template.tsx).

import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  eyebrow: string;
  title: string;
  accent?: string;
  sub?: string;
}

export function PageHeader({ eyebrow, title, accent, sub }: Props) {
  return (
    <div className="editorial pt-16 sm:pt-24 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="eyebrow mb-5"
      >
        {eyebrow}
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.05, ease: EASE }}
        className="display text-5xl sm:text-7xl lg:text-8xl tracking-snug max-w-4xl"
      >
        {title}{' '}
        {accent && <span className="text-oxblood">{accent}</span>}
      </motion.h1>

      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="mt-8 text-lg text-ink-muted max-w-2xl leading-relaxed"
        >
          {sub}
        </motion.p>
      )}
    </div>
  );
}
