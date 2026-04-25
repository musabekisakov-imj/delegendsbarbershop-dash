'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRightIcon, ScissorsIcon } from '@heroicons/react/24/outline';

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/book')) return null;

  return (
    <footer id="contact" className="border-t border-border mt-24 bg-background">
      <NewsletterBlock />

      <div className="page py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-4">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ScissorsIcon className="h-3.5 w-3.5" />
              </span>
              <span className="text-base font-bold tracking-tight">Kirpykla Vilnius</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
              Vyriški kirpimai Vilniuje. Du salonai, patyrę meistrai,
              atviri šešias dienas per savaitę.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Naršyti</div>
            <ul className="space-y-2 text-sm">
              <li><Link href="/services" className="text-foreground hover:text-primary">Paslaugos</Link></li>
              <li><Link href="/team" className="text-foreground hover:text-primary">Meistrai</Link></li>
              <li><Link href="/locations" className="text-foreground hover:text-primary">Salonai</Link></li>
              <li><Link href="/story" className="text-foreground hover:text-primary">Apie mus</Link></li>
              <li><Link href="/book" className="text-primary font-medium hover:underline">Susitarti laiką →</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-muted-foreground">
              Pilies g. 12<br />
              LT-01123 Vilnius<br />
              <a href="tel:+37060000001" className="tabular text-foreground hover:text-primary">+370 600 00001</a>
            </address>
          </div>

          <div className="lg:col-span-2 lg:col-start-11">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-muted-foreground">
              Gedimino pr. 45<br />
              LT-01103 Vilnius<br />
              <a href="tel:+37060000002" className="tabular text-foreground hover:text-primary">+370 600 00002</a>
            </address>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius</span>
          <div className="flex items-center gap-5">
            <a href="mailto:hello@kirpykla.lt" className="hover:text-foreground">hello@kirpykla.lt</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-foreground">Instagram</a>
            <span className="tabular">v0.5</span>
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
    if (email.includes('@')) setDone(true);
  }

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="page py-12">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Naujienlaiškis</div>
            <h3 className="text-2xl font-bold tracking-tight">
              Žinokite, kada atsiranda laisvi laikai.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Karta per mėnesį. Jokio spamo — tik nauji meistrai, sezoninės akcijos.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="lg:col-span-6 lg:col-start-7 flex gap-2"
          >
            {done ? (
              <p className="text-base font-medium text-emerald-700">
                Dėkui — laukite pirmojo laiško.
              </p>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jūsų@elpaštas.lt"
                  className="input flex-1"
                  required
                />
                <button type="submit" className="btn-primary shrink-0">
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
