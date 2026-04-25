'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { ArrowDownIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { Photo } from '@/components/shared/photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Hero — full-bleed photo with type overlay (Murdock pattern) ─────

export function HeroPhoto() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const photoY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const textY = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[88vh] min-h-[640px] overflow-hidden">
      {/* Photo backdrop with parallax */}
      <motion.div style={{ y: photoY }} className="absolute inset-0 -z-10">
        <Photo
          src={PHOTOS.hero}
          fallback={GRADIENTS.warm}
          alt="Vilniaus kirpykla — vakaro atmosfera"
          className="w-full h-[110%]"
        />
      </motion.div>

      {/* Warm overlay — keeps type readable, ties palette together */}
      <div
        aria-hidden
        className="absolute inset-0 -z-[5]"
        style={{
          background:
            'linear-gradient(180deg, rgba(26,23,20,0.30) 0%, rgba(26,23,20,0.55) 60%, rgba(26,23,20,0.85) 100%), radial-gradient(ellipse 50% 40% at 30% 25%, rgba(124,38,48,0.15), transparent 60%)',
        }}
      />

      {/* Hero text — rests at bottom-left like an editorial cover line */}
      <motion.div
        style={{ y: textY, opacity }}
        className="absolute inset-0 flex items-end"
      >
        <div className="editorial pb-20 sm:pb-28 w-full">
          <div className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-3 mb-8"
            >
              <span className="brass-rule" />
              <span className="text-[10px] uppercase tracking-eyebrow text-bg/80">
                Vilnius · Du salonai · Est. MMXXVI
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              className="display text-[14vw] sm:text-[10vw] lg:text-[124px] text-bg leading-[0.92] tracking-snug"
            >
              Vyriški kirpimai{' '}
              <span className="display-italic text-bg/95">be lozungų.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
              className="mt-8 text-lg text-bg/80 max-w-xl leading-relaxed"
            >
              Senamiestyje ir Naujamiestyje. Patyrę meistrai,
              kruopščiai parinkti įrankiai, jokio skubėjimo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Link href="/book" className="btn-mark-lg">
                Susitarti laiką
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/services" className="inline-flex items-center justify-center gap-2.5 rounded-DEFAULT bg-transparent text-bg border border-bg/20 px-7 py-4 text-sm font-medium tracking-wide hover:bg-bg hover:text-ink transition-all duration-200">
                Žiūrėti paslaugas
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Down indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="absolute bottom-6 right-6 hidden lg:flex flex-col items-center gap-2 text-bg/60"
      >
        <span className="text-[10px] uppercase tracking-eyebrow vertical-rl">Žvilgsnis žemiau</span>
        <ArrowDownIcon className="h-4 w-4 animate-pulse-slow" />
      </motion.div>
    </section>
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
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
