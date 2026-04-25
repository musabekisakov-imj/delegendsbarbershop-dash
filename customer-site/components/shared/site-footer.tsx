'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/book')) return null;

  return (
    <footer id="contact" className="border-t border-hairline mt-32 bg-bg">
      <NewsletterBlock />

      <div className="editorial py-20 sm:py-24">
        <div className="grid gap-16 lg:grid-cols-12">
          {/* Brand block */}
          <div className="lg:col-span-5">
            <div className="display text-4xl tracking-tight text-ink mb-4">Kirpykla</div>
            <div className="brass-rule mb-5" />
            <p className="text-ink-muted text-sm leading-relaxed max-w-sm">
              Vyriški kirpimai Vilniuje. Du salonai. Patyrę meistrai.
              Atviri šešias dienas per savaitę.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Naršyti</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/services" className="text-ink-muted hover:text-ink">Paslaugos</Link></li>
              <li><Link href="/team" className="text-ink-muted hover:text-ink">Meistrai</Link></li>
              <li><Link href="/locations" className="text-ink-muted hover:text-ink">Salonai</Link></li>
              <li><Link href="/story" className="text-ink-muted hover:text-ink">Istorija</Link></li>
              <li><Link href="/book" className="text-oxblood font-medium hover:text-oxblood-dim">Susitarti laiką →</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="eyebrow mb-4">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Pilies g. 12<br />
              LT-01123 Vilnius<br />
              <a href="tel:+37060000001" className="tabular text-ink hover:text-oxblood">+370 600 00001</a>
            </address>
          </div>

          <div className="lg:col-span-2 lg:col-start-11">
            <div className="eyebrow mb-4">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Gedimino pr. 45<br />
              LT-01103 Vilnius<br />
              <a href="tel:+37060000002" className="tabular text-ink hover:text-oxblood">+370 600 00002</a>
            </address>
          </div>
        </div>

        <div className="hairline mt-16 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] uppercase tracking-eyebrow text-ink-subtle">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius</span>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@kirpykla.lt" className="hover:text-ink">hello@kirpykla.lt</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-ink">Instagram</a>
            <span className="tabular text-ink-subtle/60">v0.4 · PARLOUR</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function NewsletterBlock() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Wire to a mailing service later (ConvertKit, Buttondown, etc.).
    if (email.includes('@')) {
      setDone(true);
    }
  }

  return (
    <section className="border-b border-hairline">
      <div className="editorial py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="eyebrow-brass mb-3">Naujienlaiškis · Karta per mėnesį</div>
            <h3 className="display text-3xl sm:text-4xl tracking-tight">
              Žinokite, kada{' '}
              <span className="display-italic text-oxblood">atsiranda laisvi laikai.</span>
            </h3>
            <p className="mt-4 text-ink-muted text-sm leading-relaxed max-w-md">
              Jokio spamo. Trumpas laiškas — naujos paslaugos, ypatingi vakarai,
              sezoninės akcijos.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-6 lg:col-start-7 flex gap-2"
          >
            {done ? (
              <p className="display text-2xl text-oxblood">
                Dėkui — laukite pirmojo laiško.
              </p>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jūsų@elpaštas.lt"
                  className="flex-1 px-5 py-3.5 rounded-DEFAULT border border-hairline-strong bg-bg-surface text-ink placeholder:text-ink-subtle focus:border-ink focus:outline-none focus:ring-2 focus:ring-oxblood/20 transition-all text-sm"
                  required
                />
                <button type="submit" className="btn-mark shrink-0">
                  Užsiprenumeruoti
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
