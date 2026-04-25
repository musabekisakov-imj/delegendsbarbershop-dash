import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';

export function SiteHeader() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="editorial flex items-center justify-between pt-6 sm:pt-8">
        <Link href="/" className="group inline-flex items-baseline gap-3">
          <span className="display text-[26px] tracking-[-0.02em] text-bone group-hover:text-vermillion transition-colors duration-300">
            Kirpykla
          </span>
          <span className="hidden sm:inline eyebrow tabular">Vilnius · MMXXVI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          <Link
            href="/#services"
            className="text-xs uppercase tracking-eyebrow text-bone-muted hover:text-bone transition-colors"
          >
            Paslaugos
          </Link>
          <Link
            href="/#locations"
            className="text-xs uppercase tracking-eyebrow text-bone-muted hover:text-bone transition-colors"
          >
            Salonai
          </Link>
          <Link
            href="/#contact"
            className="text-xs uppercase tracking-eyebrow text-bone-muted hover:text-bone transition-colors"
          >
            Kontaktai
          </Link>
        </nav>

        <Link
          href="/book"
          className="group inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow text-bone hover:text-vermillion transition-colors"
        >
          Susitarti
          <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform group-hover:rotate-45 duration-300" />
        </Link>
      </div>
    </header>
  );
}
