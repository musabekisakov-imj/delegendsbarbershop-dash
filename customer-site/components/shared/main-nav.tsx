'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/services', label: 'Paslaugos' },
  { href: '/team', label: 'Meistrai' },
  { href: '/locations', label: 'Salonai' },
];

export function MainNav() {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The booking page has its own embedded chrome — hide global nav there.
  if (pathname.startsWith('/book')) return null;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-bg/80 backdrop-blur-xl border-b border-hairline'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="editorial flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group inline-flex items-baseline gap-2.5">
          <span className="display text-[20px] tracking-snug text-ink group-hover:text-moss transition-colors">
            Kirpykla
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-eyebrow text-ink-subtle tabular">
            Vilnius
          </span>
        </Link>

        {/* Center pill nav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-pill bg-bg-raised/60 border border-hairline">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative px-4 py-1.5 rounded-pill text-xs font-medium transition-colors',
                  active
                    ? 'text-ink-inverse'
                    : 'text-ink-muted hover:text-ink',
                )}
              >
                {active && (
                  <span className="absolute inset-0 rounded-pill bg-ink -z-0" />
                )}
                <span className="relative z-10">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Live availability indicator — uses the global vermillion sparingly */}
          <span className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-bg-raised border border-hairline text-[10px] uppercase tracking-eyebrow text-ink-muted">
            <span className="live-dot" />
            Atviri dabar
          </span>
          <Link
            href="/book"
            className="btn-mark text-xs"
          >
            Susitarti laiką
          </Link>
        </div>
      </div>
    </header>
  );
}
