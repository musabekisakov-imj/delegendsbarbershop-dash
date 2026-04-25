import Link from 'next/link';
import {
  ArrowRightIcon,
  ScissorsIcon,
  ClockIcon,
  MapPinIcon,
  CheckCircleIcon,
  CalendarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { publicApi } from '@/lib/api';
import { gradientFor, serviceGradientFor } from '@/lib/tokens';
import type { Service, Office, PublicStaff } from '@/lib/types';
import { HeroIntro, RevealOnScroll, StaggerChildren, StaggerChild } from '@/components/home/home-anim';

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

  const featured = (services.length ? services : FALLBACK_SERVICES).slice(0, 4);
  const officeA = offices[0] ?? FALLBACK_OFFICES[0];
  const officeB = offices[1] ?? FALLBACK_OFFICES[1];

  return (
    <>
      <Hero todaySlots={todaySlots} sampleStaff={sampleStaff} services={featured} />
      <KpiBand staffCount={staff.length || 4} servicesCount={services.length || 5} />
      <ServicesSection services={featured} />
      <TeamPreview staff={staff.length ? staff : []} />
      <LocationsPreview officeA={officeA} officeB={officeB} />
      <BookCTA />
    </>
  );
}

// ─── Hero — split layout: intro left, live availability card right ─

function Hero({
  todaySlots,
  sampleStaff,
  services,
}: {
  todaySlots: string[];
  sampleStaff?: PublicStaff;
  services: Service[];
}) {
  return (
    <section className="border-b border-border">
      <div className="page py-12 sm:py-20">
        <HeroIntro>
          <div className="grid gap-12 lg:grid-cols-12 items-end">
            {/* Left — copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 text-[11px] font-medium mb-6">
                <span className="live-dot" />
                Atviri dabar · Užsisakymas online
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                Vyriški kirpimai{' '}
                <span className="text-primary">be skubėjimo.</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Du salonai Vilniuje, keturi patyrę meistrai. Užsisakykite vizitą
                online — patvirtinimo el. laišką gausite per minutę.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/book" className="btn-primary-lg">
                  Susitarti laiką
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
                <Link href="/services" className="btn-ghost px-6 py-3">
                  Žiūrėti paslaugas
                </Link>
              </div>

              {/* Inline trust indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Be išankstinio mokėjimo
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Atšaukti galima paskambinus
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Patvirtinimas per minutę
                </span>
              </div>
            </div>

            {/* Right — live availability card */}
            <div className="lg:col-span-5">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="eyebrow">Šiandien laisva</div>
                    <div className="mt-1.5 text-base font-semibold">
                      Su {sampleStaff?.firstName ?? 'meistru'}
                    </div>
                  </div>
                  <span className="pill-emerald">
                    <span className="live-dot" />
                    Live
                  </span>
                </div>

                {todaySlots.length > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {todaySlots.slice(0, 6).map((t) => (
                        <Link
                          key={t}
                          href="/book"
                          className="slot text-center"
                        >
                          {t}
                        </Link>
                      ))}
                    </div>
                    <Link
                      href="/book"
                      className="flex items-center justify-between text-sm font-medium text-primary hover:underline group"
                    >
                      Visi laisvi laikai ({todaySlots.length})
                      <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Šiandien viskas užsakyta. Susitarkime kitai dienai.
                  </p>
                )}

                <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-3 text-xs">
                  <Detail icon={<ScissorsIcon className="h-3.5 w-3.5" />} label="Paslauga" value={services[0]?.name ?? 'Vyriškas kirpimas'} />
                  <Detail icon={<ClockIcon className="h-3.5 w-3.5" />} label="Trukmė" value={`${services[0]?.duration ?? 45} min`} />
                </div>
              </div>
            </div>
          </div>
        </HeroIntro>
      </div>
    </section>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      <div className="text-foreground font-medium tabular truncate">{value}</div>
    </div>
  );
}

// ─── KPI band — dashboard pattern ────────────────────────────────

function KpiBand({ staffCount, servicesCount }: { staffCount: number; servicesCount: number }) {
  const kpis = [
    { icon: <MapPinIcon className="h-4 w-4" />, label: 'Salonai', value: '02', sub: 'Senamiestis · Naujamiestis' },
    { icon: <UsersIcon className="h-4 w-4" />, label: 'Meistrai', value: String(staffCount).padStart(2, '0'), sub: '5+ metų patirties' },
    { icon: <ScissorsIcon className="h-4 w-4" />, label: 'Paslaugos', value: String(servicesCount).padStart(2, '0'), sub: 'Kirpimai · Barzdos' },
    { icon: <CalendarIcon className="h-4 w-4" />, label: 'Atviri', value: '6/7', sub: 'Pirm — Šešt' },
  ];

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="page py-8">
        <StaggerChildren>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <StaggerChild key={k.label}>
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    {k.icon}
                    <span className="text-xs font-medium uppercase tracking-wider">{k.label}</span>
                  </div>
                  <div className="text-2xl font-bold tabular tracking-tight">{k.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
                </div>
              </StaggerChild>
            ))}
          </div>
        </StaggerChildren>
      </div>
    </section>
  );
}

// ─── Services — gradient-hero cards (dashboard SERVICE_GRADIENTS pattern) ─

function ServicesSection({ services }: { services: Service[] }) {
  return (
    <section className="border-b border-border">
      <div className="page py-16 sm:py-20">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="eyebrow mb-2">Paslaugos · Populiariausios</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Trumpas sąrašas, ilga praktika.
              </h2>
            </div>
            <Link href="/services" className="btn-link">
              Visas kainoraštis
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    <Link href="/book" className="card card-hover overflow-hidden flex flex-col group">
      {/* Gradient hero — matches dashboard service tiles */}
      <div className={`aspect-[4/3] bg-gradient-to-br ${serviceGradientFor(service.id)} relative`}>
        <div className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-medium">
          {service.duration} min
        </div>
        <div className="absolute bottom-3 right-3 text-white text-2xl font-bold tabular drop-shadow">
          €{service.price}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
          {service.name}
        </h3>
        {service.description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {service.description}
          </p>
        )}
      </div>
    </Link>
  );
}

// ─── Team preview — gradient avatar cards (dashboard pattern) ──

function TeamPreview({ staff }: { staff: PublicStaff[] }) {
  if (staff.length === 0) return null;

  return (
    <section className="border-b border-border bg-muted/30">
      <div className="page py-16 sm:py-20">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="eyebrow mb-2">Meistrai · Mūsų komanda</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pasirinkite tą, su kuriuo jaučiatės gerai.
              </h2>
            </div>
            <Link href="/team" className="btn-link">
              Visi meistrai
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {staff.slice(0, 4).map((s) => (
              <StaggerChild key={s.id}>
                <Link href="/book" className="card card-hover p-5 flex items-center gap-4 group">
                  <div
                    className={`h-14 w-14 rounded-full bg-gradient-to-br ${gradientFor(s.id)} flex items-center justify-center text-white font-bold tabular shrink-0`}
                    style={s.avatarUrl ? { background: `url(${s.avatarUrl}) center/cover` } : undefined}
                  >
                    {!s.avatarUrl && `${s.firstName[0]}${s.lastName[0]}`}
                  </div>
                  <div className="min-w-0">
                    <div className="text-base font-semibold group-hover:text-primary transition-colors">
                      {s.firstName} {s.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">5+ metų patirties</div>
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

// ─── Locations preview — two card spread ─────────────────────────

function LocationsPreview({ officeA, officeB }: { officeA: Office; officeB: Office }) {
  return (
    <section className="border-b border-border">
      <div className="page py-16 sm:py-20">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <div className="eyebrow mb-2">Salonai · Du adresai</div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Pasirinkite tą, kuris arčiau.
              </h2>
            </div>
            <Link href="/locations" className="btn-link">
              Salonų detalės
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>

        <div className="grid gap-4 md:grid-cols-2">
          {[officeA, officeB].map((o, i) => (
            <RevealOnScroll key={o.id} delay={i * 0.05}>
              <Link
                href={`/book?office=${o.id}`}
                className="card card-hover p-6 flex flex-col group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground tabular mb-2">
                      № {String(i + 1).padStart(2, '0')}
                    </div>
                    <h3 className="text-2xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {o.name}
                    </h3>
                  </div>
                  <span className="pill-blue">
                    <MapPinIcon className="h-3 w-3" />
                    {String(i + 1)} aukštas
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                  <MapPinIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{o.address}</span>
                </div>
                {o.phone && (
                  <div className="flex items-center gap-2 text-sm text-foreground tabular mb-4">
                    <span>{o.phone}</span>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-border grid grid-cols-3 gap-3 text-xs">
                  <Hours day="P—K" hours="09—20" />
                  <Hours day="Pen" hours="09—21" />
                  <Hours day="Šeš" hours="10—18" />
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
      <div className="text-muted-foreground font-medium uppercase tracking-wider mb-1 text-[10px]">{day}</div>
      <div className="text-foreground tabular">{hours}</div>
    </div>
  );
}

// ─── Booking CTA ────────────────────────────────────────────────

function BookCTA() {
  return (
    <section className="border-b border-border">
      <div className="page py-20 sm:py-28">
        <RevealOnScroll>
          <div className="card p-10 sm:p-14 text-center bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5">
            <div className="eyebrow mb-3">Užsisakykite šiandien</div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-[1.05]">
              Devyniasdešimt sekundžių,{' '}
              <span className="text-primary">ir laikas — jūsų.</span>
            </h2>
            <p className="mt-5 text-muted-foreground max-w-xl mx-auto">
              Pasirinkite paslaugą, meistrą ir laiką. Patvirtinimo el. laišką
              gausite per minutę.
            </p>
            <div className="mt-8">
              <Link href="/book" className="btn-primary-lg">
                Pradėti rezervaciją
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
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
  { id: '4', name: 'Skutimas peiliu', description: 'Tradicinis skutimas', price: 22, duration: 35, officeId: '', categoryId: '' },
];

const FALLBACK_OFFICES: Office[] = [
  { id: '1', name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001' },
  { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002' },
];
