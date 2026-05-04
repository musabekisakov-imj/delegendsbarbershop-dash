import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Hero } from '@/components/home/hero';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { gradientFor, serviceGradientFor } from '@/lib/tokens';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { formatLtPhone, telHref } from '@/lib/lt';
import { getServerT, getServerLang } from '@/lib/i18n';
import { translateServiceName, translateServiceDescription } from '@/lib/translate-service';
import type { Service, Office, PublicStaff } from '@/lib/types';
import type { Translations, Lang } from '@/i18n';
import { RevealOnScroll, StaggerChildren, StaggerChild } from '@/components/home/home-anim';
import { Testimonials } from '@/components/home/testimonials';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const t = getServerT();
  const lang = getServerLang();
  const [services, offices, staff] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
    publicApi.staff().catch(() => [] as PublicStaff[]),
  ]);

  const featuredServices = (services.length ? services : []).slice(0, 3);
  const officeA = offices[0] ?? FALLBACK_OFFICES[0];
  const officeB = offices[1] ?? FALLBACK_OFFICES[1];

  return (
    <>
      <Hero
        staff={staff.length ? staff : []}
        servicesCount={services.length || 17}
        officesCount={offices.length || 2}
      />
      <Manifesto t={t} />
      {featuredServices.length > 0 && <ServicesPreview t={t} lang={lang} services={featuredServices} />}
      <TeamPreview t={t} staff={staff} />
      <LocationsPreview t={t} officeA={officeA} officeB={officeB} />
      <Testimonials />
      <ClosingCTA t={t} />
    </>
  );
}

// ─── Manifesto ──────────────────────────────────────────────────

function Manifesto({ t }: { t: Translations }) {
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <div className="eyebrow mb-5">{t.manifesto.eyebrow}</div>
              <h2 className="display text-4xl sm:text-6xl">
                {t.manifesto.title_a}<span className="text-primary">{t.manifesto.title_a_accent}</span>.
                <br />
                {t.manifesto.title_b}<span className="text-primary">{t.manifesto.title_b_accent}</span>.
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <p className="text-foreground/70 text-lg leading-relaxed">{t.manifesto.body1}</p>
              <p className="mt-4 text-foreground/70 text-lg leading-relaxed">{t.manifesto.body2}</p>
              <Link
                href="/story"
                className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
              >
                {t.manifesto.cta}
                <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Services preview ──────────────────────────────────────────

function ServicesPreview({ t, lang, services }: { t: Translations; lang: Lang; services: Service[] }) {
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">{t.services_preview.eyebrow}</div>
              <h2 className="display text-4xl sm:text-5xl">
                {t.services_preview.title}<span className="text-primary">{t.services_preview.title_accent}</span>.
              </h2>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              {t.services_preview.cta}
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          {/* gap-px on bg-border container = 1px hairlines between cards */}
          <div className="grid gap-px sm:grid-cols-3 bg-border">
            {services.map((s) => (
              <StaggerChild key={s.id}>
                <ServiceCard service={s} lang={lang} bookLabel={t.ui.select_arrow} durationUnit={t.ui.duration_min} />
              </StaggerChild>
            ))}
          </div>
        </StaggerChildren>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  lang,
  bookLabel,
  durationUnit,
}: {
  service: Service;
  lang: Lang;
  bookLabel: string;
  durationUnit: string;
}) {
  const name = translateServiceName(service.name, lang);
  const description = translateServiceDescription(service.description, lang);
  const photoUrl = PHOTOS.serviceByName[service.name];
  return (
    <Link
      href="/book"
      className="group flex flex-col h-full bg-background hover:bg-surface transition-colors duration-300"
    >
      <div className="aspect-[4/3] relative overflow-hidden">
        {photoUrl ? (
          <Photo
            src={photoUrl}
            fallback={GRADIENTS.warm}
            alt={name}
            className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${serviceGradientFor(service.id)}`} />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/85 via-background/20 to-transparent pointer-events-none" />
        <div className="absolute top-4 left-4 inline-flex items-center px-2 py-1 bg-black/55 backdrop-blur text-white text-[10px] font-mono uppercase tracking-[0.18em]">
          {service.duration} {durationUnit}
        </div>
        <div className="absolute bottom-4 right-4 text-white text-3xl font-bold tabular drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
          €{service.price}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-2xl font-medium tracking-tight group-hover:text-primary transition-colors">
          {name}
        </h3>
        {description && (
          <p className="mt-2 text-sm text-foreground/60 leading-relaxed">{description}</p>
        )}
        <div className="mt-auto pt-6 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] text-foreground/60 group-hover:text-primary transition-colors">
          {bookLabel}
          <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

// ─── Team preview ──────────────────────────────────────────────

function TeamPreview({ t, staff }: { t: Translations; staff: PublicStaff[] }) {
  if (staff.length === 0) return null;
  return (
    <section className="border-t border-border bg-surface/30">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">{t.team_preview.eyebrow}</div>
              <h2 className="display text-4xl sm:text-5xl">
                {t.team_preview.title_a}
                <br />
                <span className="text-primary">{t.team_preview.title_b_accent}</span>.
              </h2>
            </div>
            <Link
              href="/team"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              {t.team_preview.cta}
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </RevealOnScroll>

        <StaggerChildren>
          <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-4 bg-border">
            {staff.slice(0, 4).map((s) => (
              <StaggerChild key={s.id}>
                <Link href="/book" className="group flex items-center gap-5 bg-background hover:bg-surface p-7 transition-colors duration-300">
                  <div
                    className={`relative size-16 rounded-full overflow-hidden bg-gradient-to-br ${gradientFor(s.id)} flex items-center justify-center text-white font-bold tabular shrink-0 ring-2 ring-primary`}
                    style={
                      PHOTOS.staffByFirstName[s.firstName] || s.avatarUrl
                        ? {
                            backgroundImage: `url("${s.avatarUrl ?? PHOTOS.staffByFirstName[s.firstName]}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : undefined
                    }
                  >
                    {!PHOTOS.staffByFirstName[s.firstName] && !s.avatarUrl &&
                      `${s.firstName[0]}${s.lastName[0]}`.toUpperCase()}
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

// ─── Locations preview ─────────────────────────────────────────

function LocationsPreview({ t, officeA, officeB }: { t: Translations; officeA: Office; officeB: Office }) {
  const items = [{ office: officeA, idx: 0 }, { office: officeB, idx: 1 }];
  return (
    <section className="border-t border-border">
      <div className="page py-24 sm:py-32">
        <RevealOnScroll>
          <div className="flex items-end justify-between gap-4 mb-12 flex-wrap">
            <div>
              <div className="eyebrow mb-4">{t.locations_preview.eyebrow}</div>
              <h2 className="display text-4xl sm:text-5xl">
                {t.locations_preview.title_a}
                <br />
                {t.locations_preview.title_b}<span className="text-primary">{t.locations_preview.title_b_accent}</span>.
              </h2>
            </div>
            <Link
              href="/locations"
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors group"
            >
              {t.locations_preview.cta}
              <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
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
                    <MapPinIcon className="h-3.5 w-3.5 mt-1 shrink-0" />
                    {office.address}
                  </div>
                  {office.phone && (
                    <a href={telHref(office.phone)} className="mt-2 inline-flex items-center gap-2 text-sm tabular text-foreground hover:text-primary transition-colors">
                      {formatLtPhone(office.phone)}
                    </a>
                  )}
                  <div className="mt-6 pt-6 border-t border-border grid grid-cols-3 gap-3 text-xs">
                    <Hours day={t.hours.week} hours="09—20" />
                    <Hours day={t.hours.fri} hours="09—21" />
                    <Hours day={t.hours.sat} hours="10—18" />
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

// ─── Closing CTA ───────────────────────────────────────────────

function ClosingCTA({ t }: { t: Translations }) {
  return (
    <section className="border-t border-border">
      <div className="page py-32 sm:py-40 text-center">
        <RevealOnScroll>
          <div className="eyebrow mb-6">{t.closing.eyebrow}</div>
          <h2 className="display text-5xl sm:text-7xl lg:text-8xl max-w-5xl mx-auto leading-[0.95]">
            {t.closing.title_a}
            <br />
            {t.closing.title_b}<span className="text-primary">{t.closing.title_accent}</span>.
          </h2>
          <p className="mt-10 text-foreground/60 max-w-xl mx-auto text-lg leading-relaxed">{t.closing.body}</p>
          <div className="mt-12 inline-flex items-center justify-center">
            <Link
              href="/book"
              className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              <span>{t.closing.cta}</span>
              <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                <ArrowRightIcon className="h-5 w-5" />
              </span>
            </Link>
          </div>
          <p className="mt-6 text-[10px] uppercase tracking-[0.18em] text-foreground/40 font-mono">
            {t.closing.fineprint}
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Fallbacks ─────────────────────────────────────────────────

const FALLBACK_OFFICES: Office[] = [
  { id: '1', name: 'Senamiestis',  address: 'Pilies g. 38, Vilnius',    phone: '+37066375648' },
  { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+37060000002' },
];
