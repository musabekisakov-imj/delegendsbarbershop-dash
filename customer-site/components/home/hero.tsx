'use client';

// HALL Hero — adapted from the supplied UI library pattern.
// Full-bleed photo background + dark overlay + avatar stack + stats
// marquee at top, brutalist split title/paragraph at the bottom.

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Photo } from '@/components/shared/photo';
import { AvatarStack } from '@/components/shared/avatar-stack';
import { StatsMarquee, defaultStats } from '@/components/shared/stats-marquee';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { PublicStaff } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  staff: PublicStaff[];
  servicesCount: number;
  officesCount: number;
}

export function Hero({ staff, servicesCount, officesCount }: Props) {
  const stats = defaultStats({
    staffCount: staff.length,
    servicesCount,
    officesCount,
  });

  return (
    <section className="relative flex h-screen min-h-[680px] w-full flex-col items-start justify-end overflow-hidden">
      {/* Background photo — covers the full viewport. */}
      <div className="absolute inset-0">
        <Photo
          src={PHOTOS.hero}
          fallback={GRADIENTS.warm}
          alt="Vilniaus kirpykla — vakaro atmosfera"
          className="h-full w-full"
          treated={false}
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* Top zone — avatar stack + stats marquee */}
      <div className="relative z-10 w-full max-w-4xl px-4 pt-24 text-foreground sm:px-8 lg:px-16">
        <div className="space-y-4">
          <AvatarStack staff={staff} />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
          >
            <StatsMarquee stats={stats} />
          </motion.div>
        </div>
      </div>

      {/* Spacer pushes the title group to the bottom */}
      <div className="flex-1" />

      {/* Bottom zone — split title + descriptive paragraph */}
      <div className="relative z-10 w-full px-4 pb-16 sm:px-8 sm:pb-24 lg:px-16 lg:pb-32">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="w-full space-y-6 sm:w-1/2">
            <h1 className="font-medium text-4xl text-foreground leading-[1.05] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              <RevealLine delay={0.15}>
                Tikri <span className="text-primary">KIRPIMAI</span> tikram
              </RevealLine>
              <RevealLine delay={0.25}>
                <span className="text-primary">VYRUI</span>
                <span className="text-foreground"> — Vilniuje, kasdien.</span>
              </RevealLine>
            </h1>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
            >
              <Link href="/book" className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200">
                <span>Susitarti laiką</span>
                <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                  <ArrowRight className="h-5 w-5" />
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
              Du salonai, keturi meistrai, vienas standartas. Pasirinkite paslaugą,
              meistrą ir laiką — patvirtinimo el. laišką gausite per minutę.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/** Animates a single hero headline line in from below. */
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
