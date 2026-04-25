import Link from 'next/link';
import { ArrowDownIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { SiteHeader } from '@/components/shared/site-header';
import { SiteFooter } from '@/components/shared/site-footer';
import { NowMarquee } from '@/components/shared/now-marquee';
import { HeroReveal, RevealOnScroll, ServiceRow } from '@/components/shared/home-anim';
import { publicApi } from '@/lib/api';
import type { Service, Office, PublicStaff } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Pull catalog + a sample of today's availability for the marquee.
  const [services, offices, staff] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
    publicApi.staff().catch(() => [] as PublicStaff[]),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const sampleStaff = staff[0];
  const todayDuration = services[0]?.duration ?? 45;
  const todaySlots: string[] = sampleStaff
    ? await publicApi
        .availability({ staffId: sampleStaff.id, date: today, duration: todayDuration })
        .catch(() => [] as string[])
    : [];

  return (
    <>
      <Hero />
      <NowMarquee slots={todaySlots} />
      <Services services={services.length ? services : FALLBACK_SERVICES} />
      <Locations offices={offices.length ? offices : FALLBACK_OFFICES} />
      <ClosingCTA />
      <SiteFooter />
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative min-h-[100vh] overflow-hidden flex flex-col">
      <SiteHeader />

      {/* Decorative vermillion glow — subtle, frames the type without dominating */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(232,72,45,0.10), transparent 60%), radial-gradient(ellipse 80% 60% at 80% 100%, rgba(244,236,219,0.04), transparent 60%)',
        }}
      />

      {/* Vertical edge marker — magazine-style ornament */}
      <div className="hidden lg:block absolute left-6 top-1/2 -translate-y-1/2">
        <span className="vmark">№ 01 — Atviras šešias dienas</span>
      </div>
      <div className="hidden lg:block absolute right-6 top-1/2 -translate-y-1/2">
        <span className="vmark">Established Vilnius MMXXVI</span>
      </div>

      {/* Hero body */}
      <div className="editorial flex-1 flex items-center pt-32 pb-24 sm:pb-32">
        <HeroReveal />
      </div>

      {/* Bottom strip — meta facts */}
      <div className="editorial pb-12">
        <div className="hairline pt-8 grid grid-cols-2 sm:grid-cols-4 gap-y-6">
          <Stat label="Salonai" value="02" />
          <Stat label="Meistrai" value="04" />
          <Stat label="Vidutinis vizitas" value="45'" />
          <Stat label="Rezervacija" value="60 sek." />
        </div>
        <div className="mt-12 flex items-center gap-2 text-bone-subtle">
          <ArrowDownIcon className="h-4 w-4 animate-pulse-slow" />
          <span className="eyebrow">Slinkti žemyn</span>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow mb-2">{label}</div>
      <div className="display text-2xl sm:text-3xl tabular text-bone">{value}</div>
    </div>
  );
}

// ─── Services — ledger menu ──────────────────────────────────────

function Services({ services }: { services: Service[] }) {
  return (
    <section id="services" className="border-t border-hairline py-32 sm:py-44">
      <div className="editorial">
        <RevealOnScroll>
          <div className="grid lg:grid-cols-12 gap-10 mb-20">
            <div className="lg:col-span-4">
              <div className="eyebrow mb-5">Paslaugos · Kainoraštis</div>
              <h2 className="display text-5xl sm:text-6xl">
                Tai, ką darome.{' '}
                <span className="display-italic text-vermillion">Be lozungų.</span>
              </h2>
            </div>
            <div className="lg:col-span-6 lg:col-start-7 self-end">
              <p className="text-bone-muted text-lg leading-relaxed max-w-xl">
                Trumpas sąrašas, ilga praktika. Kiekvienas mūsų meistras dirba bent
                penkerius metus, o trumpiausias vizitas — trisdešimt minučių.
              </p>
            </div>
          </div>
        </RevealOnScroll>

        {/* Ledger table */}
        <div className="border-t border-hairline-strong">
          {services.map((s, i) => (
            <ServiceRow key={s.id} service={s} index={i + 1} />
          ))}
        </div>

        <div className="mt-16 flex items-center justify-between">
          <span className="eyebrow">Visos kainos eurais · Be paslėptų mokesčių</span>
          <Link
            href="/book"
            className="group inline-flex items-center gap-2 text-sm tracking-wide text-bone hover:text-vermillion transition-colors"
          >
            Susitarti vizitą
            <ArrowUpRightIcon className="h-4 w-4 transition-transform group-hover:rotate-45 duration-300" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Locations — magazine spread ─────────────────────────────────

function Locations({ offices }: { offices: Office[] }) {
  return (
    <section id="locations" className="border-t border-hairline">
      <div className="editorial pt-32 sm:pt-44 pb-20">
        <RevealOnScroll>
          <div className="eyebrow mb-5">Salonai · Du adresai</div>
          <h2 className="display text-5xl sm:text-7xl mb-20 max-w-3xl leading-[0.92]">
            Pasirinkite tą,{' '}
            <span className="display-italic">kuris arčiau jūsų pasivaikščiojimo.</span>
          </h2>
        </RevealOnScroll>
      </div>

      {/* Two-column spread, edge-to-edge */}
      <div className="grid sm:grid-cols-2 border-t border-hairline">
        {offices.slice(0, 2).map((o, i) => (
          <div
            key={o.id}
            className={`p-10 sm:p-16 lg:p-20 ${i === 0 ? 'sm:border-r border-hairline' : ''}`}
          >
            <RevealOnScroll delay={i * 0.1}>
              <div className="eyebrow mb-6 tabular">№ {String(i + 1).padStart(2, '0')}</div>
              <h3 className="display text-6xl sm:text-7xl lg:text-8xl mb-8">{o.name}</h3>
              <p className="text-base leading-relaxed text-bone-muted max-w-md mb-12">
                {o.address}
              </p>
              {o.phone && (
                <a
                  href={`tel:${o.phone}`}
                  className="block tabular text-sm text-bone hover:text-vermillion transition-colors mb-12"
                >
                  {o.phone}
                </a>
              )}
              <div className="hairline pt-8 grid grid-cols-2 gap-x-8 gap-y-5">
                <Hours day="Pirmadienis—Ketvirt." hours="09:00 — 20:00" />
                <Hours day="Penktadienis" hours="09:00 — 21:00" />
                <Hours day="Šeštadienis" hours="10:00 — 18:00" />
                <Hours day="Sekmadienis" hours="Uždara" muted />
              </div>
            </RevealOnScroll>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hours({ day, hours, muted }: { day: string; hours: string; muted?: boolean }) {
  return (
    <div>
      <div className="eyebrow mb-1.5">{day}</div>
      <div className={`tabular text-sm ${muted ? 'text-bone-subtle' : 'text-bone'}`}>{hours}</div>
    </div>
  );
}

// ─── Closing CTA — wall of type ──────────────────────────────────

function ClosingCTA() {
  return (
    <section className="border-t border-hairline relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 50% 60% at 50% 100%, rgba(232,72,45,0.18), transparent 70%)',
        }}
      />
      <div className="editorial py-32 sm:py-48 text-center">
        <RevealOnScroll>
          <div className="eyebrow mb-8">Užsisakykite šiandien</div>
          <h2 className="display text-6xl sm:text-8xl lg:text-9xl leading-[0.9] max-w-5xl mx-auto">
            Devyniasdešimt sekundžių,{' '}
            <span className="display-italic text-vermillion">ir laikas — jūsų.</span>
          </h2>
          <p className="mt-12 text-bone-muted max-w-xl mx-auto text-base leading-relaxed">
            Pasirinkite paslaugą, meistrą ir laiką. Patvirtinimo el. laišką
            gausite per minutę. Atšaukti galima paskambinus į saloną.
          </p>
          <div className="mt-16">
            <Link href="/book" className="btn-mark">
              Pradėti rezervaciją
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

// ─── Fallbacks for backend-down state ───────────────────────────

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
