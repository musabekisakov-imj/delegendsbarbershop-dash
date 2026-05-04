'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/cn';
import { useT } from '@/lib/use-t';
import { LanguageSwitcher } from './language-switcher';
import { LiquidLine } from './liquid-line';

const EASE = [0.16, 1, 0.3, 1] as const;
const WORDMARK = 'De Legends';

export function MainNav() {
  const t = useT();
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);

  // Scroll-bound transforms — bar height + intensity respond to scroll position.
  // Floor at 2px / 0.85 opacity so the lime accent reads on every page even
  // before the user scrolls (no full-bleed hero on /team, /story, etc.).
  const { scrollY } = useScroll();
  const barHeight = useTransform(scrollY, [0, 200], [2, 3]);
  const barIntensity = useTransform(scrollY, [0, 200], [0.85, 1]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname.startsWith('/book')) return null;

  // Pages with a full-bleed dark hero want the nav to render on top in white
  // before the user scrolls. Other pages get the standard solid background.
  const overHero = pathname === '/' && !scrolled;

  const links = [
    { href: '/services', label: t.nav.services },
    { href: '/team', label: t.nav.team },
    { href: '/locations', label: t.nav.locations },
    { href: '/story', label: t.nav.story },
  ];

  // Drives both the sliding underline and the lime dot — single source of truth.
  const activeHref = links.find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.href;

  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: EASE }}
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-colors duration-300',
        scrolled
          ? 'bg-background/85 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      {/* Top accent — a flowing liquid wave that runs across the full width.
          Height + opacity respond to scroll so it intensifies once the user
          leaves the hero. */}
      <motion.div
        style={{ height: barHeight, opacity: barIntensity }}
        className="relative overflow-visible"
      >
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 block">
          <LiquidLine height={8} amplitude={2.2} thickness={1.4} duration={5.5} ripples={9} />
        </span>
        {/* Heartbeat dot — always-on so the accent bar reads on every page */}
        <motion.span
          aria-hidden
          className="absolute top-1/2 left-1/2 -mt-[3px] -ml-[3px] h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2.4, ease: 'easeInOut', repeat: Infinity }}
        />
      </motion.div>

      <div className="page flex h-16 items-center justify-between gap-4">
        {/* Wordmark — static. Hover only flips the colour. */}
        <Link href="/" className="group inline-flex items-baseline gap-2.5">
          <span
            className={cn(
              'text-base font-semibold tracking-tight transition-colors group-hover:text-primary',
              overHero ? 'text-white' : 'text-foreground',
            )}
          >
            {WORDMARK}
          </span>
          <span
            className={cn(
              'hidden sm:inline text-[10px] uppercase tracking-[0.18em] tabular font-mono',
              overHero ? 'text-white/50' : 'text-foreground/50',
            )}
          >
            Barbershop
          </span>
        </Link>

        {/* Nav — static. Active state is just a colour flip (lime). */}
        <nav className="hidden md:flex items-center gap-0.5">
          {links.map((l) => {
            const active = activeHref === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : overHero
                      ? 'text-white/75 hover:text-white'
                      : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher overHero={overHero} />
          <Link
            href="/book"
            className="group relative inline-flex items-center bg-primary text-primary-foreground pl-4 py-0 pr-0 text-xs font-semibold transition-colors duration-200 overflow-hidden"
          >
            {/* Hover shimmer sweep */}
            <span
              aria-hidden
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-full transition-transform duration-700 ease-out"
            />
            <span className="relative">{t.nav.book}</span>
            <span className="relative border-l border-black/30 p-2.5 ml-4 inline-flex items-center transition-transform group-hover:translate-x-0.5">
              {/* Arrow drifts gently on a 4s loop — draws the eye to the CTA */}
              <motion.span
                animate={{ x: [0, 2, 0] }}
                transition={{ duration: 3.6, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }}
              >
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </motion.span>
            </span>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
