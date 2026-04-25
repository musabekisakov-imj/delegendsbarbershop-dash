'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/services', label: 'Paslaugos' },
  { href: '/team', label: 'Meistrai' },
  { href: '/locations', label: 'Salonai' },
  { href: '/story', label: 'Istorija' },
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

  if (pathname.startsWith('/book')) return null;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-bg/85 backdrop-blur-xl border-b border-hairline'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="editorial flex h-20 items-center justify-between gap-6">
        {/* Wordmark — display serif for the heritage feel */}
        <Link href="/" className="group inline-flex items-baseline gap-3">
          <span className="display text-2xl tracking-tight text-ink group-hover:text-oxblood transition-colors">
            Kirpykla
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-eyebrow text-brass tabular">
            Vilnius · Est. MMXXVI
          </span>
        </Link>

        {/* Center nav — minimalist, no pill background (like Murdock / Hawthorne) */}
        <nav className="hidden md:flex items-center gap-9">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative text-xs uppercase tracking-eyebrow transition-colors py-1',
                  active ? 'text-ink' : 'text-ink-muted hover:text-ink',
                )}
              >
                {l.label}
                {active && (
                  <span className="absolute -bottom-1 left-0 right-0 h-px bg-oxblood" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex items-center gap-2 text-[10px] uppercase tracking-eyebrow text-ink-muted">
            <span className="live-dot" />
            Atviri dabar
          </span>
          <Link href="/book" className="btn-mark text-xs px-5 py-2.5">
            Susitarti
          </Link>
        </div>
      </div>
    </header>
  );
}
