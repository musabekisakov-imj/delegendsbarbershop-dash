'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ScissorsIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/services', label: 'Paslaugos' },
  { href: '/team', label: 'Meistrai' },
  { href: '/locations', label: 'Salonai' },
  { href: '/story', label: 'Apie' },
];

export function MainNav() {
  const pathname = usePathname() ?? '/';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (pathname.startsWith('/book')) return null;

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-all duration-200',
        scrolled
          ? 'bg-background/85 backdrop-blur-xl border-b border-border'
          : 'bg-background border-b border-transparent',
      )}
    >
      <div className="page flex h-14 items-center justify-between gap-6">
        {/* Wordmark — dashboard-style icon + tight type */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ScissorsIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
            Kirpykla
          </span>
          <span className="hidden md:inline text-[11px] font-medium text-muted-foreground tabular">
            · Vilnius
          </span>
        </Link>

        {/* Center nav — text-only links with underline-active state */}
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  active ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden lg:inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700">
            <span className="live-dot" />
            Atviri dabar
          </span>
          <Link href="/book" className="btn-primary text-xs px-4 py-2">
            Susitarti laiką
          </Link>
        </div>
      </div>
    </header>
  );
}
