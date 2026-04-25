'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  // Booking page has its own self-contained chrome.
  if (pathname.startsWith('/book')) return null;

  return (
    <footer id="contact" className="border-t border-hairline mt-32">
      <div className="editorial py-20 sm:py-28">
        <div className="grid gap-16 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <div className="display text-3xl tracking-tighter text-ink mb-3">Kirpykla</div>
            <p className="text-ink-muted text-sm leading-relaxed max-w-sm">
              Vyriški kirpimai Vilniuje. Du salonai. Patyrę meistrai.
              Atviri šešias dienas per savaitę.
            </p>
          </div>

          {/* Sitemap */}
          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Naršyti</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/services" className="text-ink-muted hover:text-ink">Paslaugos</Link></li>
              <li><Link href="/team" className="text-ink-muted hover:text-ink">Meistrai</Link></li>
              <li><Link href="/locations" className="text-ink-muted hover:text-ink">Salonai</Link></li>
              <li><Link href="/book" className="text-moss font-medium hover:text-ink">Susitarti laiką →</Link></li>
            </ul>
          </div>

          {/* Senamiestis */}
          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Pilies g. 12<br />
              LT-01123 Vilnius<br />
              <a href="tel:+37060000001" className="tabular text-ink hover:text-moss">+370 600 00001</a>
            </address>
          </div>

          {/* Naujamiestis */}
          <div className="lg:col-span-2 lg:col-start-11">
            <div className="eyebrow mb-4">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Gedimino pr. 45<br />
              LT-01103 Vilnius<br />
              <a href="tel:+37060000002" className="tabular text-ink hover:text-moss">+370 600 00002</a>
            </address>
          </div>
        </div>

        <div className="hairline mt-16 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] uppercase tracking-eyebrow text-ink-subtle">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius</span>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@kirpykla.lt" className="hover:text-ink">hello@kirpykla.lt</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-ink">Instagram</a>
            <span className="tabular text-ink-subtle/60">v0.3 · STUDIO</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
