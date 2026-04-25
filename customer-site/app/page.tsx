import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { Service, Office, PublicStaff } from '@/lib/types';
import { HomeHero, BentoReveal } from '@/components/home/home-anim';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [services, offices, staff] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
    publicApi.staff().catch(() => [] as PublicStaff[]),
  ]);

  // Live availability sample for the bento "now" cell
  const today = new Date().toISOString().slice(0, 10);
  const sampleStaff = staff[0];
  const sampleService = services[0];
  const todaySlots: string[] = sampleStaff && sampleService
    ? await publicApi
        .availability({ staffId: sampleStaff.id, date: today, duration: sampleService.duration })
        .catch(() => [] as string[])
    : [];

  const featuredService = services.find((s) => s.name.toLowerCase().includes('kirpimas')) ?? services[0];
  const officeA = offices[0];
  const officeB = offices[1];

  return (
    <>
      <HomeHero />
      <Bento
        slots={todaySlots}
        sampleStaff={sampleStaff}
        sampleService={sampleService}
        featured={featuredService}
        officeA={officeA}
        officeB={officeB}
        staff={staff}
      />
      <Manifesto />
    </>
  );
}

// ─── Bento — modular grid of 6 cells ─────────────────────────────

interface BentoProps {
  slots: string[];
  sampleStaff?: PublicStaff;
  sampleService?: Service;
  featured?: Service;
  officeA?: Office;
  officeB?: Office;
  staff: PublicStaff[];
}

function Bento({ slots, sampleStaff, sampleService, featured, officeA, officeB, staff }: BentoProps) {
  return (
    <section className="editorial py-20">
      <BentoReveal>
        <div className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(180px,auto)] gap-3 sm:gap-4">
          {/* 1. Live availability — wide, dark inverse panel — STAR cell */}
          <div className="md:col-span-4 md:row-span-2 card-inverse p-8 sm:p-10 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <span className="live-dot" />
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-inverse/60">
                Šiandien laisva · Su {sampleStaff?.firstName ?? 'meistru'}
              </span>
            </div>
            <h3 className="display text-4xl sm:text-5xl lg:text-6xl text-ink-inverse mb-6">
              {slots.length > 0 ? `${slots.length} laisvi laikai` : 'Visi laikai užimti'}
            </h3>
            {slots.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-auto">
                {slots.slice(0, 8).map((t) => (
                  <Link
                    key={t}
                    href="/book"
                    className="px-4 py-2 rounded-pill border border-hairline-inverse-strong tabular text-sm text-ink-inverse hover:bg-ink-inverse hover:text-ink transition-all"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-ink-inverse/60 text-base mb-auto max-w-md">
                Susitarkime kitai dienai — pasirinkimas dar platus.
              </p>
            )}
            <div className="mt-8 flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-inverse/40 tabular">
                Atnaujinta dabar
              </span>
              <Link
                href="/book"
                className="inline-flex items-center gap-2 text-sm text-ink-inverse hover:text-live transition-colors"
              >
                Visi laikai
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* 2. Featured service — compact card with price */}
          <Link
            href="/services"
            className="md:col-span-2 card card-hover p-7 flex flex-col group"
          >
            <span className="eyebrow mb-4">Populiariausia</span>
            <div className="display text-3xl tracking-tight mb-2 group-hover:text-moss transition-colors">
              {featured?.name ?? 'Vyriškas kirpimas'}
            </div>
            <p className="text-sm text-ink-muted mt-auto mb-4">
              {featured?.description || 'Klasikinis arba modernus.'}
            </p>
            <div className="flex items-baseline justify-between">
              <span className="display text-3xl tabular text-ink">€{featured?.price ?? 25}</span>
              <span className="text-[10px] uppercase tracking-eyebrow text-ink-subtle tabular">
                {featured?.duration ?? 45} min
              </span>
            </div>
          </Link>

          {/* 3. Stat trio — compact */}
          <div className="md:col-span-2 card p-6 flex flex-col justify-between">
            <span className="eyebrow">Mūsų pasaulis</span>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <Stat value="02" label="Salonai" />
              <Stat value="04" label="Meistrai" />
              <Stat value="06" label="Dienos" />
            </div>
          </div>

          {/* 4. Office A — photo card */}
          <Link href="/locations" className="md:col-span-2 card card-hover overflow-hidden group flex flex-col">
            <Photo
              src={PHOTOS.locationByIndex[0]}
              fallback={GRADIENTS.warm}
              alt={officeA?.name ?? 'Senamiestis'}
              className="aspect-[4/3]"
            />
            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow mb-1">№ 01 · Salonas</div>
                <div className="display text-xl tracking-tight">{officeA?.name ?? 'Senamiestis'}</div>
                <div className="text-xs text-ink-muted mt-0.5 inline-flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3" />
                  {officeA?.address?.split(',')[0] ?? 'Pilies g. 12'}
                </div>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-ink-subtle group-hover:text-ink group-hover:rotate-45 transition-all duration-300" />
            </div>
          </Link>

          {/* 5. Office B — photo card */}
          <Link href="/locations" className="md:col-span-2 card card-hover overflow-hidden group flex flex-col">
            <Photo
              src={PHOTOS.locationByIndex[1]}
              fallback={GRADIENTS.amber}
              alt={officeB?.name ?? 'Naujamiestis'}
              className="aspect-[4/3]"
            />
            <div className="p-5 flex items-start justify-between gap-3">
              <div>
                <div className="eyebrow mb-1">№ 02 · Salonas</div>
                <div className="display text-xl tracking-tight">{officeB?.name ?? 'Naujamiestis'}</div>
                <div className="text-xs text-ink-muted mt-0.5 inline-flex items-center gap-1">
                  <MapPinIcon className="h-3 w-3" />
                  {officeB?.address?.split(',')[0] ?? 'Gedimino pr. 45'}
                </div>
              </div>
              <ArrowUpRightIcon className="h-4 w-4 text-ink-subtle group-hover:text-ink group-hover:rotate-45 transition-all duration-300" />
            </div>
          </Link>

          {/* 6. Team preview — compact */}
          <Link href="/team" className="md:col-span-2 card card-hover p-6 flex flex-col group">
            <span className="eyebrow mb-4">Meistrai</span>
            <div className="flex -space-x-2 mb-auto">
              {staff.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="h-10 w-10 rounded-full bg-bg-raised border-2 border-bg-surface flex items-center justify-center text-xs font-semibold text-ink"
                  style={s.avatarUrl ? { background: `url(${s.avatarUrl}) center/cover` } : undefined}
                >
                  {!s.avatarUrl && `${s.firstName[0]}${s.lastName[0]}`}
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between mt-4">
              <span className="display text-2xl tracking-tight group-hover:text-moss transition-colors">
                {staff.length || 4} meistrai
              </span>
              <ArrowUpRightIcon className="h-4 w-4 text-ink-subtle group-hover:text-ink group-hover:rotate-45 transition-all duration-300" />
            </div>
          </Link>
        </div>
      </BentoReveal>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="display text-2xl tabular text-ink">{value}</div>
      <div className="text-[9px] uppercase tracking-eyebrow text-ink-muted mt-1">{label}</div>
    </div>
  );
}

// ─── Closing manifesto ──────────────────────────────────────────

function Manifesto() {
  return (
    <section className="border-t border-hairline mt-20">
      <div className="editorial py-24 sm:py-32">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <span className="eyebrow mb-5 inline-block">Filosofija</span>
            <h2 className="display text-4xl sm:text-5xl tracking-snug">
              Trumpas sąrašas, ilga praktika.{' '}
              <span className="text-moss">Be lozungų, be paspaudimų.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <p className="text-ink-muted text-lg leading-relaxed mb-8">
              Mes nedirbame su devyniomis paslaugomis ir trimis franšizėmis.
              Du salonai, keturi meistrai, vienas standartas — kruopštumas.
              Užsisakykite vizitą per minutę.
            </p>
            <Link href="/book" className="btn-mark-lg">
              Susitarti laiką
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
