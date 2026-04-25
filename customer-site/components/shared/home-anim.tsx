'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { Service } from '@/lib/types';

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

// ─── Hero — staggered word-by-word reveal ───────────────────────

export function HeroReveal() {
  // Each line animates in with a slight delay. The final italic word has its
  // own staggered entrance to land as the punctuation moment.
  const lines = ['Iškirpti.', 'Suformuoti.'];
  const finalWord = 'Atsipalaiduoti.';

  return (
    <div className="max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: REVEAL_EASE }}
        className="eyebrow mb-10"
      >
        Vilnius · Du salonai · MMXXVI
      </motion.div>

      <h1 className="display text-[14vw] sm:text-[11vw] lg:text-[148px] leading-[0.86] tracking-[-0.035em]">
        {lines.map((line, i) => (
          <motion.span
            key={line}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.9,
              delay: 0.15 + i * 0.12,
              ease: REVEAL_EASE,
            }}
            className="block"
          >
            {line}
          </motion.span>
        ))}
        <motion.span
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.45, ease: REVEAL_EASE }}
          className="display-italic block text-vermillion"
        >
          {finalWord}
        </motion.span>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.7, ease: REVEAL_EASE }}
        className="mt-12 max-w-xl text-lg sm:text-xl leading-relaxed text-bone-muted"
      >
        Patyrę meistrai. Tikras kirpimas, ne fast-food konvejerinis.
        Du salonai senamiestyje ir naujamiestyje.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.85, ease: REVEAL_EASE }}
        className="mt-14 flex flex-wrap items-center gap-4"
      >
        <Link href="/book" className="btn-mark">
          Susitarti laiką
          <ArrowUpRightIcon className="h-4 w-4" />
        </Link>
        <Link href="#services" className="btn-ghost">
          Žiūrėti paslaugas
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Generic scroll-triggered reveal ────────────────────────────

export function RevealOnScroll({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.9, delay, ease: REVEAL_EASE }}
    >
      {children}
    </motion.div>
  );
}

// ─── Service ledger row — animated entrance + interactive hover ─

export function ServiceRow({ service, index }: { service: Service; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.7, delay: index * 0.06, ease: REVEAL_EASE }}
      className="border-b border-hairline group"
    >
      <Link
        href="/book"
        className="flex items-baseline gap-6 py-7 sm:py-9 hover:bg-ink-2/40 transition-colors duration-300 px-2 -mx-2"
      >
        {/* Number column */}
        <span className="hidden sm:block w-10 shrink-0 eyebrow tabular pt-2">
          {String(index).padStart(2, '0')}
        </span>

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <h3 className="display text-3xl sm:text-4xl lg:text-5xl tracking-[-0.025em] group-hover:text-vermillion transition-colors duration-300">
            {service.name}
          </h3>
          {service.description && (
            <p className="mt-2 text-sm text-bone-muted">{service.description}</p>
          )}
        </div>

        {/* Duration */}
        <div className="hidden md:block text-right shrink-0 w-24">
          <div className="eyebrow mb-1">Trukmė</div>
          <div className="tabular text-bone text-base">{service.duration} min</div>
        </div>

        {/* Price */}
        <div className="text-right shrink-0 w-20 sm:w-28">
          <div className="hidden md:block eyebrow mb-1">Kaina</div>
          <div className="display text-3xl sm:text-4xl tabular text-bone group-hover:text-vermillion transition-colors duration-300">
            €{service.price}
          </div>
        </div>

        {/* Arrow — appears on hover */}
        <ArrowUpRightIcon
          className="hidden sm:block h-5 w-5 text-bone-subtle group-hover:text-vermillion group-hover:rotate-45 transition-all duration-300 shrink-0"
        />
      </Link>
    </motion.div>
  );
}
