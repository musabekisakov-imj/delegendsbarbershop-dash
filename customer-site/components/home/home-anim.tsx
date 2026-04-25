'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowUpRightIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Hero ───────────────────────────────────────────────────────

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Backdrop — soft moss radial glow + warm cream */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 80% 20%, rgba(44,74,56,0.10), transparent 60%), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(232,72,45,0.04), transparent 60%)',
        }}
      />

      <div className="editorial pt-12 sm:pt-20 pb-16 sm:pb-24">
        <div className="grid lg:grid-cols-12 gap-10 items-end">
          {/* Headline */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex items-center gap-2 mb-6"
            >
              <span className="live-dot" />
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-muted">
                Atviri dabar · Vilnius
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
              className="display text-[14vw] sm:text-[10vw] lg:text-[120px] tracking-snug leading-[0.92]"
            >
              Vyriški kirpimai{' '}
              <span className="text-moss">be lozungų.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
              className="mt-10 text-lg sm:text-xl text-ink-muted max-w-xl leading-relaxed"
            >
              Du salonai Vilniuje. Keturi meistrai.
              Susitarkite vizitą — pasirinkimas matomas iš karto.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
              className="mt-12 flex flex-wrap items-center gap-3"
            >
              <Link href="/book" className="btn-mark-lg">
                Susitarti laiką
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <Link href="/services" className="btn-ghost">
                Žiūrėti paslaugas
              </Link>
            </motion.div>
          </div>

          {/* Right meta column */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.35 }}
            className="hidden lg:block lg:col-span-4 lg:col-start-9"
          >
            <div className="border-l border-hairline pl-6 space-y-7">
              <MetaRow label="Vidutinis vizitas" value="45 min" />
              <MetaRow label="Trumpiausias" value="30 min" />
              <MetaRow label="Atviri" value="Pirm — Šešt" />
              <MetaRow label="Rezervacija" value="60 sek." />
            </div>
          </motion.div>
        </div>

        {/* Down indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-20 flex items-center gap-2 text-ink-subtle"
        >
          <ArrowDownIcon className="h-3.5 w-3.5 animate-pulse-slow" />
          <span className="text-[10px] uppercase tracking-eyebrow">Žvilgsnis žemiau</span>
        </motion.div>
      </div>
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-eyebrow text-ink-subtle mb-1.5">{label}</div>
      <div className="display text-2xl tabular text-ink">{value}</div>
    </div>
  );
}

// ─── Bento reveal — staggered fade-up of bento children ─────────

export function BentoReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06 } },
      }}
    >
      {/* Wrap the grid so the children inside can use motion variants */}
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 16 },
          show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
