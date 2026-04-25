import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <div className="grid gap-16 lg:grid-cols-12">
          {/* Manifesto block */}
          <div className="lg:col-span-6">
            <div className="eyebrow mb-6">Kirpykla · Vilnius · MMXXVI</div>
            <p className="display text-4xl sm:text-5xl leading-[1.02] tracking-[-0.025em] max-w-xl">
              Užsukite, jei norite tikro kirpimo&nbsp;—{' '}
              <span className="display-italic text-vermillion">ir tikro pokalbio.</span>
            </p>
          </div>

          {/* Address blocks */}
          <div className="lg:col-span-3">
            <div className="eyebrow mb-4 text-bone">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-bone-muted">
              Pilies g. 12<br />
              LT-01123 Vilnius
            </address>
            <a
              href="tel:+37060000001"
              className="mt-3 block text-sm tabular text-bone hover:text-vermillion transition-colors"
            >
              +370 600 00001
            </a>
          </div>

          <div className="lg:col-span-3">
            <div className="eyebrow mb-4 text-bone">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-bone-muted">
              Gedimino pr. 45<br />
              LT-01103 Vilnius
            </address>
            <a
              href="tel:+37060000002"
              className="mt-3 block text-sm tabular text-bone hover:text-vermillion transition-colors"
            >
              +370 600 00002
            </a>
          </div>
        </div>

        {/* Hairline rule + colophon */}
        <div className="hairline mt-20 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-[10px] uppercase tracking-eyebrow text-bone-subtle">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius — Visos teisės saugomos</span>
          <div className="flex items-center gap-8">
            <Link href="/book" className="hover:text-vermillion transition-colors">
              Susitarti laiką
            </Link>
            <a href="mailto:hello@kirpykla.lt" className="hover:text-vermillion transition-colors">
              hello@kirpykla.lt
            </a>
            <span className="tabular text-bone-dim">v. 0.2 · HOURS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
