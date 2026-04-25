import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Photo } from '@/components/shared/photo';
import { HeroPhoto, RevealOnScroll } from '@/components/home/home-anim';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { Service, Office, PublicStaff } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [services, offices, staff] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
    publicApi.staff().catch(() => [] as PublicStaff[]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const sampleStaff = staff[0];
  const sampleService = services[0];
  const todaySlots: string[] = sampleStaff && sampleService
    ? await publicApi
        .availability({ staffId: sampleStaff.id, date: today, duration: sampleService.duration })
        .catch(() => [] as string[])
    : [];

  const featured = services.slice(0, 3);
  const officeA = offices[0];
  const officeB = offices[1];

  return (
    <>
      <HeroPhoto />
      <Manifesto />
      <ServicesPreview services={featured.length ? featured : FALLBACK_SERVICES} />
      <Atmosfera />
      <LocationsPreview officeA={officeA} officeB={officeB} />
      <LiveBookingStrip slots={todaySlots} sampleStaff={sampleStaff} />
      <ClosingCTA />
    </>
  );
}

// ─── Manifesto — narrative intro after the hero (Hawthorne pattern) ─

function Manifesto() {
  return (
    <section className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <div className="eyebrow-brass mb-4">Filosofija · Mūsų darbas</div>
              <h2 className="display text-4xl sm:text-6xl tracking-snug">
                Trumpas sąrašas.{' '}
                <span className="display-italic text-oxblood">Ilga praktika.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <p className="text-ink-muted text-lg leading-relaxed">
                Mes nedirbame su devyniomis paslaugomis ir trimis franšizėmis.
                Du salonai, keturi meistrai, vienas standartas — kruopštumas.
              </p>
              <p className="mt-4 text-ink-muted text-lg leading-relaxed">
                Vidutinis vizitas — keturiasdešimt penkios minutės. Per tą laiką
                nesusiformuoja vaikiškas šokių pamokos ritmas — tik kirpimas,
                pokalbis ir, jei reikia, tylos minutė.
              </p>
              <Link
                href="/story"
                className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-ink hover:text-oxblood transition-colors"
              >
                Skaityti istoriją
                <ArrowUpRightIcon className="h-3.5 w-3.5 transition-transform group-hover:rotate-45" />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Services preview — 3 featured services as photo cards ────────

function ServicesPreview({ services }: { services: Service[] }) {
  return (
    <section className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-8 mb-16 flex-wrap">
            <div>
              <div className="eyebrow-brass mb-4">Paslaugos · Trys populiariausios</div>
              <h2 className="display text-4xl sm:text-5xl tracking-snug">
                Tai, ką darome geriausiai.
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm tracking-wide text-ink hover:text-oxblood transition-colors inline-flex items-center gap-2 group"
            >
              Visas kainoraštis
              <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:rotate-45 duration-300" />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="grid gap-6 md:grid-cols-3">
          {services.slice(0, 3).map((s, i) => (
            <RevealOnScroll key={s.id} delay={i * 0.1}>
              <Link href="/book" className="group block">
                <Photo
                  src={PHOTOS.atmosfera[i % PHOTOS.atmosfera.length].url}
                  fallback={[GRADIENTS.warm, GRADIENTS.amber, GRADIENTS.earth][i % 3]}
                  alt={s.name}
                  className="aspect-[4/5] overflow-hidden rounded-card mb-5 transition-transform duration-700 group-hover:scale-[1.02]"
                />
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display text-2xl sm:text-3xl tracking-tight group-hover:text-oxblood transition-colors">
                    {s.name}
                  </h3>
                  <span className="display text-2xl tabular text-oxblood">€{s.price}</span>
                </div>
                <div className="mt-1.5 text-xs uppercase tracking-eyebrow text-ink-muted tabular">
                  {s.duration} min
                </div>
                {s.description && (
                  <p className="mt-3 text-sm text-ink-muted leading-relaxed">{s.description}</p>
                )}
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Atmosfera — magazine spread (Hawthorne / Pankhurst pattern) ──

function Atmosfera() {
  const [a, b, c, d] = PHOTOS.atmosfera;
  return (
    <section className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10 mb-16">
            <div className="lg:col-span-5">
              <div className="eyebrow-brass mb-4">Atmosfera · Mūsų pasaulis</div>
              <h2 className="display text-4xl sm:text-5xl tracking-snug">
                Vieta,{' '}
                <span className="display-italic text-oxblood">kurioje neskubama.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <p className="text-ink-muted text-lg leading-relaxed">
                Vienas šviesos židinys, sena oda, šukos, gerai galąsti įrankiai.
                Tikras barbershop&apos;as Vilniaus centre — toks, koks turi būti.
              </p>
            </div>
          </div>
        </RevealOnScroll>

        <div className="grid grid-cols-12 gap-3 sm:gap-4">
          <RevealOnScroll>
            <div className="col-span-12 lg:col-span-7">
              <Photo
                src={a.url}
                fallback={GRADIENTS.warm}
                alt={a.alt}
                className="aspect-[4/5] lg:aspect-[5/7] rounded-card overflow-hidden"
              />
              <Caption text={a.caption} />
            </div>
          </RevealOnScroll>

          <div className="col-span-12 lg:col-span-5 grid grid-cols-1 gap-3 sm:gap-4">
            <RevealOnScroll delay={0.1}>
              <Photo
                src={b.url}
                fallback={GRADIENTS.amber}
                alt={b.alt}
                className="aspect-[4/3] rounded-card overflow-hidden"
              />
              <Caption text={b.caption} />
            </RevealOnScroll>
            <RevealOnScroll delay={0.2}>
              <Photo
                src={c.url}
                fallback={GRADIENTS.earth}
                alt={c.alt}
                className="aspect-[4/3] rounded-card overflow-hidden"
              />
              <Caption text={c.caption} />
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={0.3}>
            <div className="col-span-12 mt-1 sm:mt-2">
              <Photo
                src={d.url}
                fallback={GRADIENTS.cool}
                alt={d.alt}
                className="aspect-[16/7] rounded-card overflow-hidden"
              />
              <Caption text={d.caption} />
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="eyebrow">{text}</span>
      <span className="text-[10px] uppercase tracking-eyebrow text-ink-subtle tabular">35mm · Vilnius</span>
    </div>
  );
}

// ─── Locations preview — two photo cards ──────────────────────────

function LocationsPreview({ officeA, officeB }: { officeA?: Office; officeB?: Office }) {
  const items = [
    { office: officeA ?? FALLBACK_OFFICES[0], idx: 0 },
    { office: officeB ?? FALLBACK_OFFICES[1], idx: 1 },
  ];
  return (
    <section className="border-t border-hairline">
      <div className="editorial py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-8 mb-16 flex-wrap">
            <div>
              <div className="eyebrow-brass mb-4">Salonai · Du adresai</div>
              <h2 className="display text-4xl sm:text-5xl tracking-snug">
                Pasirinkite{' '}
                <span className="display-italic">tą, kuris arčiau.</span>
              </h2>
            </div>
            <Link
              href="/locations"
              className="text-sm tracking-wide text-ink hover:text-oxblood transition-colors inline-flex items-center gap-2 group"
            >
              Visos salonų detalės
              <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:rotate-45 duration-300" />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map(({ office, idx }) => (
            <RevealOnScroll key={office.id} delay={idx * 0.1}>
              <Link href="/locations" className="group block">
                <Photo
                  src={PHOTOS.locationByIndex[idx]}
                  fallback={idx === 0 ? GRADIENTS.warm : GRADIENTS.amber}
                  alt={office.name}
                  className="aspect-[16/10] rounded-card overflow-hidden mb-6 transition-transform duration-700 group-hover:scale-[1.01]"
                />
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="display text-3xl sm:text-4xl tracking-tight group-hover:text-oxblood transition-colors">
                    {office.name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-eyebrow text-brass tabular">
                    № {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-muted">
                  <MapPinIcon className="h-3.5 w-3.5" />
                  {office.address}
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Live booking strip — keeps the "real availability" insight ──

function LiveBookingStrip({ slots, sampleStaff }: { slots: string[]; sampleStaff?: PublicStaff }) {
  return (
    <section className="border-t border-hairline inverse">
      <div className="editorial py-20 sm:py-24">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="live-dot" />
                <span className="text-[10px] uppercase tracking-eyebrow text-bg/60">
                  Šiandien laisva · Su {sampleStaff?.firstName ?? 'meistru'}
                </span>
              </div>
              <h3 className="display text-3xl sm:text-5xl text-bg tracking-snug">
                {slots.length > 0
                  ? `${slots.length} laisvi laikai`
                  : 'Visi laikai užimti'}
              </h3>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              {slots.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {slots.slice(0, 8).map((t) => (
                    <Link
                      key={t}
                      href="/book"
                      className="px-4 py-2 rounded-DEFAULT border border-hairline-inverse-strong tabular text-sm text-bg hover:bg-bg hover:text-ink transition-all"
                    >
                      {t}
                    </Link>
                  ))}
                  <Link
                    href="/book"
                    className="px-4 py-2 rounded-DEFAULT bg-bg text-ink text-sm font-medium hover:bg-oxblood hover:text-bg transition-all inline-flex items-center gap-2"
                  >
                    Visi
                    <ArrowUpRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="text-bg/70 text-base">
                  Susitarkime kitai dienai — pasirinkimas dar platus.
                </p>
              )}
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Closing CTA ────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section className="border-t border-hairline">
      <div className="editorial py-32 sm:py-40 text-center">
        <RevealOnScroll>
          <div className="eyebrow-brass mb-6">Užsisakykite šiandien</div>
          <h2 className="display text-5xl sm:text-7xl lg:text-8xl tracking-snug max-w-4xl mx-auto leading-[0.92]">
            Devyniasdešimt sekundžių,{' '}
            <span className="display-italic text-oxblood">ir laikas — jūsų.</span>
          </h2>
          <p className="mt-10 text-ink-muted max-w-xl mx-auto text-lg leading-relaxed">
            Pasirinkite paslaugą, meistrą ir laiką. Patvirtinimo el. laišką
            gausite per minutę.
          </p>
          <div className="mt-12">
            <Link href="/book" className="btn-mark-lg">
              Pradėti rezervaciją
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Fallbacks ──────────────────────────────────────────────────

const FALLBACK_SERVICES: Service[] = [
  { id: '1', name: 'Vyriškas kirpimas', description: 'Klasikinis arba modernus', price: 25, duration: 45, officeId: '', categoryId: '' },
  { id: '2', name: 'Barzdos formavimas', description: 'Su karštu rankšluosčiu', price: 18, duration: 30, officeId: '', categoryId: '' },
  { id: '3', name: 'Kirpimas + barzda', description: 'Kombinuota paslauga', price: 38, duration: 70, officeId: '', categoryId: '' },
];

const FALLBACK_OFFICES: Office[] = [
  { id: '1', name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001' },
  { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002' },
];
