import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import type { Office } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Salonai',
  description: 'Du salonai Vilniuje — Senamiestyje ir Naujamiestyje.',
};

const HOURS_GRID = [
  { day: 'Pirmadienis—Ketvirtadienis', hours: '09:00 — 20:00' },
  { day: 'Penktadienis', hours: '09:00 — 21:00' },
  { day: 'Šeštadienis', hours: '10:00 — 18:00' },
  { day: 'Sekmadienis', hours: 'Uždara', muted: true },
];

const FALLBACK_OFFICES: Office[] = [
  { id: '1', name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001', timezone: 'Europe/Vilnius' },
  { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002', timezone: 'Europe/Vilnius' },
];

export default async function LocationsPage() {
  const offices = (await publicApi.offices().catch(() => [] as Office[])) || [];
  const items = offices.length ? offices : FALLBACK_OFFICES;

  return (
    <>
      <PageHeader
        eyebrow="Salonai · Du adresai"
        title="Du salonai."
        accent="Vienas standartas."
        sub="Senamiestyje ir Naujamiestyje — pasirinkite tą, kuris arčiau jūsų pasivaikščiojimo maršruto. Abiem dirba ta pati komanda, ta pati kruopštumo kultūra."
      />

      <section className="editorial pb-32">
        <div className="grid gap-8 lg:gap-10">
          {items.slice(0, 2).map((o, i) => (
            <LocationBlock key={o.id} office={o} index={i} />
          ))}
        </div>
      </section>
    </>
  );
}

function LocationBlock({ office, index }: { office: Office; index: number }) {
  const photoUrl = PHOTOS.locationByIndex[index] ?? PHOTOS.locationByIndex[0];
  const fallback = index === 0 ? GRADIENTS.warm : GRADIENTS.amber;

  return (
    <article className="card overflow-hidden">
      <div className="grid lg:grid-cols-12">
        {/* Photo — 7 of 12 columns */}
        <div className={index % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-7 lg:order-2'}>
          <Photo
            src={photoUrl}
            fallback={fallback}
            alt={`${office.name} interjeras`}
            className="aspect-[16/10] lg:aspect-auto lg:h-full"
          />
        </div>

        {/* Content — 5 of 12 columns */}
        <div className={`lg:col-span-5 p-8 sm:p-10 lg:p-14 flex flex-col ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
          <div className="eyebrow mb-4 tabular">№ {String(index + 1).padStart(2, '0')} · Salonas</div>

          <h2 className="display text-5xl sm:text-6xl tracking-snug mb-6">{office.name}</h2>

          <div className="space-y-3 mb-10">
            <div className="flex items-start gap-3 text-ink">
              <MapPinIcon className="h-4 w-4 mt-1 text-ink-subtle shrink-0" />
              <span className="text-sm leading-relaxed">{office.address}</span>
            </div>
            {office.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-ink-subtle shrink-0" />
                <a href={`tel:${office.phone}`} className="text-sm tabular text-ink hover:text-moss transition-colors">
                  {office.phone}
                </a>
              </div>
            )}
          </div>

          {/* Hours */}
          <div className="hairline pt-6">
            <div className="eyebrow mb-4">Darbo laikas</div>
            <dl className="space-y-2.5">
              {HOURS_GRID.map((h) => (
                <div key={h.day} className="flex items-baseline justify-between gap-4 py-1">
                  <dt className={`text-xs ${h.muted ? 'text-ink-subtle' : 'text-ink-muted'}`}>{h.day}</dt>
                  <dd className={`tabular text-sm ${h.muted ? 'text-ink-subtle' : 'text-ink'}`}>{h.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10">
            <Link href={`/book?office=${office.id}`} className="btn-mark">
              Susitarti šiame salone
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
