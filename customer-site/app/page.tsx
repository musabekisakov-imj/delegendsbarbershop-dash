import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { publicApi } from '@/lib/api';
import type { Service, Office } from '@/lib/types';

// Render at request time so build doesn't depend on the backend being reachable.
// Catalog data is cached at the fetch level via `next.revalidate` in lib/api.ts.
export const dynamic = 'force-dynamic';

// Server component — fetches services + offices on every request (revalidated).
export default async function HomePage() {
  // Resilient fetches — site renders even if backend is down (deployed before backend).
  const [services, offices] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
  ]);

  // Show a curated 3 from the catalog. Falls back to placeholders if backend is unreachable.
  const featured = services.slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ServicesPreview services={featured} />
        <Locations offices={offices} />
        <Closing />
      </main>
      <SiteFooter />
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative warm gradient — replaces the standard "AI dashboard purple" cliché */}
      <div
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(192,101,58,0.18), transparent 60%), linear-gradient(180deg, #FAF7F2 0%, #F4EFE6 100%)',
        }}
      />
      <div className="editorial pt-24 pb-32 sm:pt-32 sm:pb-40">
        <div className="max-w-4xl">
          <div className="eyebrow mb-8">Vilnius · Du salonai · Est. 2024</div>
          <h1 className="display text-5xl sm:text-7xl lg:text-[96px] leading-[0.92]">
            Iškirpti.<br />
            Suformuoti.<br />
            <span className="italic" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              Atsipalaiduoti.
            </span>
          </h1>
          <p className="mt-10 max-w-xl text-lg leading-relaxed text-ink-muted">
            Patyrę meistrai. Tikras kirpimas, ne fast-food konvejerinis.
            Du salonai senamiestyje ir naujamiestyje, atviri šešias dienas per savaitę.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Link href="/book" className="btn-primary">
              Susitarti laiką
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="#services" className="btn-secondary">
              Žiūrėti paslaugas
            </Link>
          </div>
        </div>

        {/* Editorial meta strip — the kind of detail that signals craft */}
        <div className="mt-24 grid grid-cols-2 sm:grid-cols-4 gap-y-8 hairline pt-10">
          <Stat label="Salonai" value="2" />
          <Stat label="Meistrai" value="4" />
          <Stat label="Vidutinis vizitas" value="45 min" />
          <Stat label="Atviri" value="Pirm — Šešt" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="display text-2xl mt-2 tabular">{value}</div>
    </div>
  );
}

// ─── Services preview ────────────────────────────────────────────

function ServicesPreview({ services }: { services: Service[] }) {
  // Fallback content for when the backend is unreachable — site still feels complete.
  const fallback = [
    { id: '1', name: 'Vyriškas kirpimas', description: 'Klasikinis arba modernus', price: 25, duration: 45 },
    { id: '2', name: 'Barzdos formavimas', description: 'Su karštu rankšluosčiu', price: 18, duration: 30 },
    { id: '3', name: 'Kirpimas + barzda', description: 'Kombinuota paslauga', price: 38, duration: 70 },
  ];
  const items = services.length > 0 ? services : (fallback as unknown as Service[]);

  return (
    <section id="services" className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <div className="flex items-end justify-between gap-8 mb-16 flex-wrap">
          <div>
            <div className="eyebrow mb-4">Paslaugos · Trys populiariausios</div>
            <h2 className="display text-4xl sm:text-5xl">Tai, ką darome geriausiai.</h2>
          </div>
          <Link href="/book" className="text-sm text-ink-muted hover:text-ink inline-flex items-center gap-2 group">
            Visa paslaugų kainoraštis
            <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {items.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i + 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ service, index }: { service: Service; index: number }) {
  return (
    <Link
      href="/book"
      className="group flex flex-col"
    >
      {/* Photo placeholder — gradient block when no image. Editorial monogram corner. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-[3px] bg-bg-raised mb-6">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          style={{
            background:
              service.imageUrl
                ? `url(${service.imageUrl}) center/cover`
                : 'linear-gradient(135deg, #C0653A 0%, #8B4A2A 60%, #1B1916 130%)',
          }}
        />
        <div className="absolute inset-0 ring-1 ring-inset ring-ink/[0.06]" />
        <div className="absolute top-4 left-4 text-bg/80 text-xs font-mono tabular">
          № {String(index).padStart(2, '0')}
        </div>
        <div className="absolute bottom-4 right-4 text-bg/80 eyebrow !text-[10px]">
          {service.duration} min
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <h3 className="display text-2xl sm:text-3xl tracking-[-0.01em]">{service.name}</h3>
        <span className="display text-2xl tabular text-accent">€{service.price}</span>
      </div>
      {service.description && (
        <p className="mt-2 text-sm text-ink-muted leading-relaxed">{service.description}</p>
      )}
    </Link>
  );
}

// ─── Locations ───────────────────────────────────────────────────

function Locations({ offices }: { offices: Office[] }) {
  const fallback: Office[] = [
    { id: '1', name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001' },
    { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002' },
  ];
  const items = offices.length > 0 ? offices : fallback;

  return (
    <section id="locations" className="border-t border-hairline bg-bg-raised">
      <div className="editorial py-24 sm:py-32">
        <div className="eyebrow mb-4">Salonai · Du adresai</div>
        <h2 className="display text-4xl sm:text-5xl mb-16 max-w-3xl">
          Pasirinkite tą, kuris arčiau jūsų pasivaikščiojimo maršruto.
        </h2>

        <div className="grid gap-px sm:grid-cols-2 bg-hairline">
          {items.slice(0, 2).map((o, i) => (
            <div key={o.id} className="bg-bg-raised p-10 sm:p-14">
              <div className="eyebrow mb-3 tabular">№ {i + 1}</div>
              <h3 className="display text-3xl sm:text-4xl">{o.name}</h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">{o.address}</p>
              {o.phone && (
                <a href={`tel:${o.phone}`} className="mt-2 block text-sm text-ink-muted hover:text-ink tabular">
                  {o.phone}
                </a>
              )}
              <div className="mt-10 hairline pt-6 grid grid-cols-2 gap-4 text-xs">
                <Hours day="Pirm — Penkt" hours="09:00 — 20:00" />
                <Hours day="Šeštadienį" hours="10:00 — 18:00" />
                <Hours day="Sekmadienį" hours="Uždara" />
                <Hours day="Penktadienį" hours="iki 21:00" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hours({ day, hours }: { day: string; hours: string }) {
  return (
    <div>
      <div className="eyebrow !text-[10px] mb-1">{day}</div>
      <div className="text-ink tabular">{hours}</div>
    </div>
  );
}

// ─── Closing CTA ─────────────────────────────────────────────────

function Closing() {
  return (
    <section className="border-t border-hairline bg-ink text-bg">
      <div className="editorial py-24 sm:py-32 text-center">
        <div className="eyebrow !text-bg/60 mb-6">Užsisakykite šiandien</div>
        <h2 className="display text-5xl sm:text-7xl max-w-3xl mx-auto leading-[0.95]">
          Devyniasdešimt sekundžių, ir laikas — jūsų.
        </h2>
        <p className="mt-8 text-bg/70 max-w-xl mx-auto text-base leading-relaxed">
          Pasirinkite paslaugą, meistrą ir laiką. Patvirtinimo el. laišką gausite per minutę.
        </p>
        <div className="mt-12">
          <Link
            href="/book"
            className="inline-flex items-center justify-center gap-2 rounded-[3px] bg-bg text-ink px-8 py-4 text-sm font-medium tracking-wide hover:bg-accent hover:text-bg-surface transition-colors"
          >
            Pradėti
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
