'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
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
  // The home page has a full-bleed dark hero — nav stays transparent over it.
  const [overHero, setOverHero] = useState(pathname === '/');

  useEffect(() => {
    setOverHero(pathname === '/' && window.scrollY < window.innerHeight - 100);
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setOverHero(pathname === '/' && window.scrollY < window.innerHeight - 100);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  if (pathname.startsWith('/book')) return null;

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border'
          : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="page flex h-16 items-center justify-between gap-6">
        <Link href="/" className="group inline-flex items-baseline gap-2.5">
          <span className="text-base font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">
            Kirpykla
          </span>
          <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-foreground/50 tabular font-mono">
            Vilnius · MMXXVI
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-foreground/70 hover:text-foreground',
                )}
              >
                {l.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-3 right-3 h-px bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/book"
            className="inline-flex items-center bg-primary text-primary-foreground pl-4 py-0 pr-0 text-xs font-medium hover:bg-foreground hover:text-background transition-colors duration-200"
          >
            <span>Susitarti</span>
            <span className="border-l border-black/30 p-2.5 ml-4 inline-flex items-center">
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
