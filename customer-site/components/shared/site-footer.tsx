'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export function SiteFooter() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/book')) return null;

  return (
    <footer id="contact" className="border-t border-border bg-background">
      <NewsletterBlock />

      <div className="page py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Link href="/" className="text-xl font-medium tracking-tight text-foreground hover:text-primary transition-colors">
              Kirpykla
            </Link>
            <p className="mt-4 text-foreground/60 text-sm leading-relaxed max-w-sm">
              Vyriški kirpimai Vilniuje. Du salonai, patyrę meistrai,
              atviri šešias dienas per savaitę.
            </p>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4">Naršyti</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/services" className="text-foreground hover:text-primary transition-colors">Paslaugos</Link></li>
              <li><Link href="/team" className="text-foreground hover:text-primary transition-colors">Meistrai</Link></li>
              <li><Link href="/locations" className="text-foreground hover:text-primary transition-colors">Salonai</Link></li>
              <li><Link href="/story" className="text-foreground hover:text-primary transition-colors">Istorija</Link></li>
              <li><Link href="/book" className="text-primary font-medium hover:underline">Susitarti laiką →</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-foreground/70">
              Pilies g. 12<br />
              LT-01123 Vilnius<br />
              <a href="tel:+37060000001" className="tabular text-foreground hover:text-primary transition-colors">+370 600 00001</a>
            </address>
          </div>

          <div className="lg:col-span-2 lg:col-start-11">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-foreground/70">
              Gedimino pr. 45<br />
              LT-01103 Vilnius<br />
              <a href="tel:+37060000002" className="tabular text-foreground hover:text-primary transition-colors">+370 600 00002</a>
            </address>
          </div>
        </div>

        <div className="mt-16 pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px] uppercase tracking-[0.18em] text-foreground/40 font-mono">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius</span>
          <div className="flex items-center gap-6">
            <a href="mailto:hello@kirpykla.lt" className="hover:text-foreground transition-colors">hello@kirpykla.lt</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">Instagram</a>
            <span className="tabular">v0.6 · HALL</span>
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
    <section className="border-b border-border">
      <div className="page py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary mb-3 font-mono">Naujienlaiškis · Karta per mėnesį</div>
            <h3 className="display text-3xl sm:text-4xl">
              Žinokite, kada
              <br />
              <span className="text-primary">atsiranda laisvi laikai</span>.
            </h3>
            <p className="mt-4 text-foreground/60 text-sm leading-relaxed max-w-md">
              Jokio spamo. Trumpas laiškas — naujos paslaugos, sezoninės akcijos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-6 lg:col-start-7 flex gap-0">
            {done ? (
              <p className="text-2xl font-medium text-primary">
                Dėkui — laukite pirmojo laiško.
              </p>
            ) : (
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jūsų@elpaštas.lt"
                  className="flex-1 px-5 py-4 bg-surface border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors text-sm"
                  required
                />
                <button
                  type="submit"
                  className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors duration-200 shrink-0"
                >
                  <span>Užsiprenumeruoti</span>
                  <span className="border-l border-black/30 p-4 ml-5 inline-flex items-center">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
