import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer id="contact" className="border-t border-hairline mt-32">
      <div className="editorial py-20">
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="eyebrow mb-4">Kirpykla · Vilnius</div>
            <p className="display text-3xl sm:text-4xl leading-[1.05] tracking-[-0.02em]">
              Užsukite, jei norite tikro kirpimo ir tikro pokalbio.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-7">
            <div className="eyebrow mb-4">Senamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Pilies g. 12<br />
              LT-01123 Vilnius<br />
              <a href="tel:+37060000001" className="hover:text-ink">+370 600 00001</a>
            </address>
          </div>

          <div className="md:col-span-3">
            <div className="eyebrow mb-4">Naujamiestis</div>
            <address className="not-italic text-sm leading-7 text-ink-muted">
              Gedimino pr. 45<br />
              LT-01103 Vilnius<br />
              <a href="tel:+37060000002" className="hover:text-ink">+370 600 00002</a>
            </address>
          </div>
        </div>

        <div className="hairline mt-16 pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-ink-subtle">
          <span>© {new Date().getFullYear()} Kirpykla Vilnius. Visos teisės saugomos.</span>
          <div className="flex items-center gap-6">
            <Link href="/book" className="hover:text-ink">Susitarti laiką</Link>
            <a href="mailto:hello@kirpykla.lt" className="hover:text-ink">hello@kirpykla.lt</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
