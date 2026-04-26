'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { formatLtPhone, telHref, mapsHref } from '@/lib/lt';
import { useT } from '@/lib/use-t';

export function SiteFooter() {
  const t = useT();
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/book')) return null;

  return (
    <footer id="contact" className="border-t border-border bg-background">
      <NewsletterBlock />

      <div className="page py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-5">
            <Link href="/" className="text-xl font-medium tracking-tight text-foreground hover:text-primary transition-colors">
              Kirpykla Vilnius
            </Link>
            <p className="mt-4 text-foreground/60 text-sm leading-relaxed max-w-sm">
              {t.footer.tagline}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 border border-border text-[10px] uppercase tracking-[0.18em] text-foreground/60 font-mono">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {t.footer.open_now}
            </div>
          </div>

          {/* Sitemap */}
          <div className="lg:col-span-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4 font-mono">{t.footer.nav_label}</div>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/services" className="text-foreground hover:text-primary transition-colors">{t.nav.services}</Link></li>
              <li><Link href="/team" className="text-foreground hover:text-primary transition-colors">{t.nav.team}</Link></li>
              <li><Link href="/locations" className="text-foreground hover:text-primary transition-colors">{t.nav.locations}</Link></li>
              <li><Link href="/story" className="text-foreground hover:text-primary transition-colors">{t.nav.story}</Link></li>
              <li><Link href="/book" className="text-primary font-medium hover:underline">{t.footer.book_link}</Link></li>
            </ul>
          </div>

          {/* Senamiestis */}
          <div className="lg:col-span-2">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4 font-mono">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-foreground/70">
              <a href={mapsHref('Pilies g. 12, Vilnius')} target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
                Pilies g. 12<br />
                LT-01123 Vilnius
              </a><br />
              <a href={telHref('+37060000001')} className="tabular text-foreground hover:text-primary transition-colors">
                {formatLtPhone('+37060000001')}
              </a>
            </address>
          </div>

          {/* Naujamiestis */}
          <div className="lg:col-span-2 lg:col-start-11">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4 font-mono">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-foreground/70">
              <a href={mapsHref('Gedimino pr. 45, Vilnius')} target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
                Gedimino pr. 45<br />
                LT-01103 Vilnius
              </a><br />
              <a href={telHref('+37060000002')} className="tabular text-foreground hover:text-primary transition-colors">
                {formatLtPhone('+37060000002')}
              </a>
            </address>
          </div>
        </div>

        {/* Legal + business meta strip */}
        <div className="mt-16 pt-6 border-t border-border grid gap-3 sm:grid-cols-[1fr_auto] items-baseline">
          <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/40 font-mono leading-relaxed">
            {t.footer.legal_company.replace('{year}', String(new Date().getFullYear()))}<br />
            {t.footer.legal_vat}
          </div>
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.18em] font-mono">
            <Link href="/privacy" className="text-foreground/60 hover:text-foreground transition-colors">{t.footer.privacy}</Link>
            <Link href="/terms" className="text-foreground/60 hover:text-foreground transition-colors">{t.footer.terms}</Link>
            <a href="mailto:hello@kirpykla.lt" className="text-foreground/60 hover:text-foreground transition-colors">hello@kirpykla.lt</a>
            <a href="https://instagram.com" target="_blank" rel="noopener" className="text-foreground/60 hover:text-foreground transition-colors">Instagram</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function NewsletterBlock() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [consent, setConsent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.includes('@') && consent) setDone(true);
  }

  return (
    <section className="border-b border-border">
      <div className="page py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-primary mb-3 font-mono">
              {t.newsletter.eyebrow}
            </div>
            <h3 className="display text-3xl sm:text-4xl">
              {t.newsletter.title_a}
              <br />
              <span className="text-primary">{t.newsletter.title_accent}</span>.
            </h3>
            <p className="mt-4 text-foreground/60 text-sm leading-relaxed max-w-md">{t.newsletter.body}</p>
          </div>

          <form onSubmit={handleSubmit} className="lg:col-span-6 lg:col-start-7 space-y-4">
            {done ? (
              <p className="text-2xl font-medium text-primary">{t.newsletter.success}</p>
            ) : (
              <>
                <div className="flex gap-0">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.newsletter.placeholder}
                    className="flex-1 px-5 py-4 bg-surface border border-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-primary transition-colors text-sm"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!consent || !email}
                    className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors duration-200 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>{t.newsletter.submit}</span>
                    <span className="border-l border-black/30 p-4 ml-5 inline-flex items-center">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </button>
                </div>
                <label className="flex items-start gap-2.5 text-xs text-foreground/60 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
                    required
                  />
                  <span>
                    {t.newsletter.consent}{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      {t.newsletter.consent_link}
                    </Link>
                    .
                  </span>
                </label>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
