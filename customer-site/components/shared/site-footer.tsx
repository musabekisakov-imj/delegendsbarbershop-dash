'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { formatLtPhone, telHref, mapsHref } from '@/lib/lt';
import { useT } from '@/lib/use-t';
import { SITE, legalLine } from '@/lib/site-config';

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
              {SITE.name}
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
              <li><Link href="/faq" className="text-foreground hover:text-primary transition-colors">{t.page.faq.eyebrow.split(' · ')[0]}</Link></li>
              <li><Link href="/gift-cards" className="text-foreground hover:text-primary transition-colors">{t.page.gifts.eyebrow.split(' · ')[0]}</Link></li>
              <li><Link href="/book" className="text-primary font-medium hover:underline">{t.footer.book_link}</Link></li>
            </ul>
          </div>

          {SITE.offices.map((office, idx) => {
            const [street] = office.address.split(',');
            return (
              <div key={office.key} className={idx === 1 ? 'lg:col-span-2 lg:col-start-11' : 'lg:col-span-2'}>
                <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-foreground/40 mb-4 font-mono">
                  {office.name}
                </div>
                <address className="not-italic text-sm leading-7 text-foreground/70">
                  <a href={mapsHref(office.address)} target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
                    {street.trim()}<br />
                    {office.postalCode} Vilnius
                  </a><br />
                  <a href={telHref(office.phone)} className="tabular text-foreground hover:text-primary transition-colors">
                    {formatLtPhone(office.phone)}
                  </a>
                </address>
              </div>
            );
          })}
        </div>

        {/* Legal + business meta strip */}
        <div className="mt-16 pt-6 border-t border-border grid gap-3 sm:grid-cols-[1fr_auto] items-baseline">
          <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/40 font-mono leading-relaxed">
            {legalLine(new Date().getFullYear())}<br />
            {t.footer.legal_vat}
          </div>
          <div className="flex items-center flex-wrap gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.18em] font-mono">
            <Link href="/privacy" className="text-foreground/60 hover:text-foreground transition-colors">{t.footer.privacy}</Link>
            <Link href="/terms" className="text-foreground/60 hover:text-foreground transition-colors">{t.footer.terms}</Link>
            <a href={`mailto:${SITE.email}`} className="text-foreground/60 hover:text-foreground transition-colors">{SITE.email}</a>
            {SITE.instagram && (
              <a href={SITE.instagram} target="_blank" rel="noopener" className="text-foreground/60 hover:text-foreground transition-colors">Instagram</a>
            )}
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@') || !consent) return;
    setSubmitting(true);
    setError(null);
    try {
      // Lazy-import the client API only on submit so the footer doesn't pull
      // it into its initial bundle.
      const { publicApi, ApiError } = await import('@/lib/api');
      await publicApi.subscribeNewsletter(email);
      setDone(true);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? '';
      setError(msg || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
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
                    disabled={!consent || !email || submitting}
                    className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors duration-200 shrink-0 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <span>{submitting ? '…' : t.newsletter.submit}</span>
                    <span className="border-l border-black/30 p-4 ml-5 inline-flex items-center">
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-300/90" role="alert">{error}</p>
                )}
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
