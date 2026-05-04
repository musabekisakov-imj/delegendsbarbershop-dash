'use client';

// HALL Hero — adapted from the supplied UI library pattern.
// Full-bleed photo background + dark overlay + stats marquee at top,
// brutalist split title/paragraph at the bottom. The avatar cluster lived
// here previously but read as a confusing not-logo — moved out, brand
// identity is carried by the wordmark in the nav.

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { Photo } from '@/components/shared/photo';
import { StatsMarquee } from '@/components/shared/stats-marquee';
import { useT } from '@/lib/use-t';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { PublicStaff } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  staff: PublicStaff[];
  servicesCount: number;
  officesCount: number;
}

export function Hero({ staff, servicesCount, officesCount }: Props) {
  const t = useT();
  const stats = [
    { value: String(officesCount).padStart(2, '0'), label: `${t.stats.salons} · ${t.stats.salons_sub}` },
    { value: String(staff.length || 4).padStart(2, '0'), label: `${t.stats.masters} · ${t.stats.masters_sub}` },
    { value: String(servicesCount).padStart(2, '0'), label: `${t.stats.services} · ${t.stats.services_sub}` },
    { value: t.stats.days, label: t.stats.days_sub },
    { value: t.stats.est, label: t.stats.est_sub },
    { value: t.stats.booking, label: t.stats.booking_sub },
  ];

  return (
    <section className="relative flex h-screen min-h-[680px] w-full flex-col items-start justify-end overflow-hidden">
      {/* Background photo */}
      <div className="absolute inset-0">
        <Photo
          src={PHOTOS.hero}
          fallback={GRADIENTS.warm}
          alt="Vilnius barbershop interior"
          className="h-full w-full"
          treated={false}
        />
        <div className="absolute inset-0 bg-black/60" />
        {/* Bottom gradient — keeps the title legible regardless of photo subject */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      </div>

      {/* Top zone — stats marquee only (avatar cluster removed) */}
      <div className="relative z-10 w-full pt-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
        >
          <StatsMarquee stats={stats} />
        </motion.div>
      </div>

      <div className="flex-1" />

      {/* Bottom zone — split title + descriptive paragraph */}
      <div className="relative z-10 w-full px-4 pb-16 sm:px-8 sm:pb-24 lg:px-16 lg:pb-32">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-full space-y-6 sm:w-1/2">
            <h1 className="font-medium text-4xl text-white leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <RevealLine delay={0.15}>
                {t.hero.line1}
                <span className="text-primary">{t.hero.accent1}</span>,
              </RevealLine>
              <RevealLine delay={0.25}>
                {t.hero.line2}
                <span className="text-primary">{t.hero.accent2}</span>
                <span> Vilnius.</span>
              </RevealLine>
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
            >
              <Link
                href="/book"
                className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-base font-semibold hover:bg-white hover:text-black transition-colors duration-200"
              >
                <span>{t.nav.book}</span>
                <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                  <ArrowRightIcon className="h-5 w-5" />
                </span>
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
            className="w-full sm:w-1/2"
          >
            <p className="text-base text-primary italic sm:text-right md:text-2xl leading-relaxed">
              {t.hero.paragraph}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function RevealLine({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.span
      initial={{ y: 28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className="block"
    >
      {children}
    </motion.span>
  );
}
