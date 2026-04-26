import Link from 'next/link';
import { ArrowRight, MapPin, Clock } from 'lucide-react';
import { Hero } from '@/components/home/hero';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { gradientFor, serviceGradientFor } from '@/lib/tokens';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { Service, Office, PublicStaff } from '@/lib/types';
import { RevealOnScroll, StaggerChildren, StaggerChild } from '@/components/home/home-anim';

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

  const featuredServices = (services.length ? services : FALLBACK_SERVICES).slice(0, 3);
  const officeA = offices[0] ?? FALLBACK_OFFICES[0];
  const officeB = offices[1] ?? FALLBACK_OFFICES[1];

  return (
    <>
      <Hero
        staff={staff.length ? staff : []}
        servicesCount={services.length || 5}
        officesCount={offices.length || 2}
      />
      <Manifesto />
      <ServicesPreview services={featuredServices} />
      <TeamPreview staff={staff} />
      <LocationsPreview officeA={officeA} officeB={officeB} />
      <LiveBookingStrip slots={todaySlots} sampleStaff={sampleStaff} />
      <ClosingCTA />
    </>
  );
}

// ─── Manifesto ───────────────────────────────────────────────────

function Manifesto() {
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <div className="eyebrow mb-5">Filosofija · Mūsų darbas</div>
              <h2 className="display text-4xl sm:text-6xl">
                Trumpas <span className="text-primary">sąrašas</span>.
                <br />
                Ilga <span className="text-primary">praktika</span>.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <p className="text-foreground/70 text-lg leading-relaxed">
                Mes nedirbame su devyniomis paslaugomis ir trimis franšizėmis.
                Du salonai, keturi meistrai, vienas standartas — kruopštumas.
              </p>
              <p className="mt-4 text-foreground/70 text-lg leading-relaxed">
                Vidutinis vizitas — keturiasdešimt penkios minutės. Per tą laiką
                tilps ir kirpimas, ir pokalbis, ir, jei reikia, tylos minutė.
              </p>
              <Link
                href="/story"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
              >
                Skaityti istoriją
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Services preview ────────────────────────────────────────────

function ServicesPreview({ services }: { services: Service[] }) {
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">Paslaugos · Populiariausios</div>
              <h2 className="display text-4xl sm:text-5xl">
                Tai, ką <span className="text-primary">darome geriausiai</span>.
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              Visas kainoraštis
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          <div className="grid gap-px sm:grid-cols-3 bg-border">
            {services.map((s) => (
              <StaggerChild key={s.id}>
                <ServiceCard service={s} />
              </StaggerChild>
            ))}
          </div>
        </StaggerChildren>
      </div>
    </section>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link href="/book" className="group flex flex-col bg-background hover:bg-surface transition-colors duration-300">
      <div className={`aspect-[4/3] bg-gradient-to-br ${serviceGradientFor(service.id)} relative`}>
        <div className="absolute top-4 left-4 inline-flex items-center px-2 py-1 bg-black/40 backdrop-blur text-foreground text-[10px] font-mono uppercase tracking-[0.18em]">
          {service.duration} min
        </div>
        <div className="absolute bottom-4 right-4 text-foreground text-3xl font-bold tabular drop-shadow">
          €{service.price}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-medium tracking-tight group-hover:text-primary transition-colors">
          {service.name}
        </h3>
        {service.description && (
          <p className="mt-2 text-sm text-foreground/60 leading-relaxed">{service.description}</p>
        )}
        <div className="mt-auto pt-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-foreground/60 group-hover:text-primary transition-colors">
          Užsisakyti
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// ─── Team preview ────────────────────────────────────────────────

function TeamPreview({ staff }: { staff: PublicStaff[] }) {
  if (staff.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/30">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">Meistrai · Mūsų komanda</div>
              <h2 className="display text-4xl sm:text-5xl">
                Pasirinkite tą, su kuriuo
                <br />
                <span className="text-primary">jaučiatės gerai</span>.
              </h2>
            </div>
            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              Visi meistrai
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-border">
            {staff.slice(0, 4).map((s) => (
              <StaggerChild key={s.id}>
                <Link href="/book" className="group flex items-center gap-5 bg-background hover:bg-surface p-7 transition-colors duration-300">
                  <div
                    className={`size-16 rounded-full bg-gradient-to-br ${gradientFor(s.id)} flex items-center justify-center text-foreground font-bold tabular shrink-0 border-2 border-primary`}
                  >
                    {`${s.firstName[0]}${s.lastName[0]}`.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xl font-medium tracking-tight group-hover:text-primary transition-colors">
                      {s.firstName}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/50 mt-1">
                      {s.lastName}
                    </div>
                  </div>
                </Link>
              </StaggerChild>
            ))}
          </div>
        </StaggerChildren>
      </div>
    </section>
  );
}

// ─── Locations preview ──────────────────────────────────────────

function LocationsPreview({ officeA, officeB }: { officeA: Office; officeB: Office }) {
  const items = [
    { office: officeA, idx: 0 },
    { office: officeB, idx: 1 },
  ];
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">Salonai · Du adresai</div>
              <h2 className="display text-4xl sm:text-5xl">
                Pasirinkite tą,
                <br />
                kuris <span className="text-primary">arčiau</span>.
              </h2>
            </div>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              Salonų detalės
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="grid gap-px sm:grid-cols-2 bg-border">
          {items.map(({ office, idx }) => (
            <RevealOnScroll key={office.id} delay={idx * 0.08}>
              <Link href={`/book?office=${office.id}`} className="group block bg-background hover:bg-surface transition-colors duration-300">
                <Photo
                  src={PHOTOS.locationByIndex[idx] ?? PHOTOS.locationByIndex[0]}
                  fallback={idx === 0 ? GRADIENTS.warm : GRADIENTS.amber}
                  alt={office.name}
                  className="aspect-[16/10]"
                />
                <div className="p-7">
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="text-3xl font-medium tracking-tight group-hover:text-primary transition-colors">
                      {office.name}
                    </h3>
                    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary tabular">
                      № 0{idx + 1}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-foreground/60 leading-relaxed">
                    <MapPin className="h-3.5 w-3.5 mt-1 shrink-0" />
                    {office.address}
                  </div>
                  {office.phone && (
                    <a href={`tel:${office.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm tabular text-foreground hover:text-primary transition-colors">
                      {office.phone}
                    </a>
                  )}
                  <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-3 text-xs">
                    <Hours day="P—K" hours="09—20" />
                    <Hours day="Pen" hours="09—21" />
                    <Hours day="Šeš" hours="10—18" />
                  </div>
                </div>
              </Link>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hours({ day, hours }: { day: string; hours: string }) {
  return (
    <div>
      <div className="text-foreground/40 font-medium uppercase tracking-[0.18em] text-[10px] mb-1">{day}</div>
      <div className="text-foreground tabular">{hours}</div>
    </div>
  );
}

// ─── Live booking strip — keeps the "real availability" insight ─

function LiveBookingStrip({ slots, sampleStaff }: { slots: string[]; sampleStaff?: PublicStaff }) {
  return (
    <section className="border-t border-border bg-primary text-primary-foreground">
      <div className="page py-16 sm:py-20">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary-foreground animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.18em] text-primary-foreground/70 font-mono">
                  Šiandien laisva · Su {sampleStaff?.firstName ?? 'meistru'}
                </span>
              </div>
              <h3 className="display text-3xl sm:text-5xl text-primary-foreground">
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
                      className="px-4 py-2 border border-primary-foreground/20 bg-background text-foreground tabular text-sm hover:bg-foreground hover:text-background transition-all"
                    >
                      {t}
                    </Link>
                  ))}
                  <Link
                    href="/book"
                    className="px-4 py-2 bg-primary-foreground text-primary text-sm font-medium hover:bg-foreground hover:text-background transition-all inline-flex items-center gap-2"
                  >
                    Visi
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="text-primary-foreground/70 text-base">
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
    <section className="border-t border-border">
      <div className="page py-32 sm:py-40 text-center">
        <RevealOnScroll>
          <div className="eyebrow mb-6">Užsisakykite šiandien</div>
          <h2 className="display text-5xl sm:text-7xl lg:text-8xl max-w-5xl mx-auto leading-[0.95]">
            Devyniasdešimt sekundžių,
            <br />
            ir <span className="text-primary">laikas — jūsų</span>.
          </h2>
          <p className="mt-10 text-foreground/60 max-w-xl mx-auto text-lg leading-relaxed">
            Pasirinkite paslaugą, meistrą ir laiką. Patvirtinimo el. laišką
            gausite per minutę.
          </p>
          <div className="mt-12 inline-flex items-center justify-center">
            <Link
              href="/book"
              className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              <span>Pradėti rezervaciją</span>
              <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                <ArrowRight className="h-5 w-5" />
              </span>
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
