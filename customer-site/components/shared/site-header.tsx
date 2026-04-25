import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="border-b border-hairline bg-bg/80 backdrop-blur sticky top-0 z-30">
      <div className="editorial flex h-16 items-center justify-between">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="display text-[22px] tracking-[-0.01em]">Kirpykla</span>
          <span className="eyebrow">Vilnius · Est. 2024</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-sm">
          <Link href="/#services" className="text-ink-muted hover:text-ink transition-colors">
            Paslaugos
          </Link>
          <Link href="/#locations" className="text-ink-muted hover:text-ink transition-colors">
            Salonai
          </Link>
          <Link href="/#contact" className="text-ink-muted hover:text-ink transition-colors">
            Kontaktai
          </Link>
        </nav>
        <Link href="/book" className="btn-primary text-xs px-5 py-2.5">
          Susitarti laiką
        </Link>
      </div>
    </header>
  );
}
