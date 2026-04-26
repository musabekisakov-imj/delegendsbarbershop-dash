import Link from 'next/link';
import { ArrowUpRightIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { formatLtPhone, telHref, mapsHref } from '@/lib/lt';
import { getServerT } from '@/lib/i18n';
import type { Office } from '@/lib/types';
import type { Translations } from '@/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.locations.eyebrow.split(' · ')[0],
    description: t.page.locations.sub,
  };
}

const FALLBACK_OFFICES: Office[] = [
  { id: '1', name: 'Senamiestis', address: 'Pilies g. 12, Vilnius', phone: '+370 600 00001', timezone: 'Europe/Vilnius' },
  { id: '2', name: 'Naujamiestis', address: 'Gedimino pr. 45, Vilnius', phone: '+370 600 00002', timezone: 'Europe/Vilnius' },
];

export default async function LocationsPage() {
  const t = getServerT();
  const offices = (await publicApi.offices().catch(() => [] as Office[])) || [];
  const items = offices.length ? offices : FALLBACK_OFFICES;

  // Hours grid is structured per language (day labels translate, hour values stay).
  const hoursGrid = [
    { day: t.hours.week === 'M—T' ? 'Mon — Thu' : t.hours.week === 'Пн—Чт' ? 'Понедельник — Четверг' : 'Pirmadienis — Ketvirtadienis', hours: '09:00 — 20:00' },
    { day: t.hours.fri === 'Fri' ? 'Friday' : t.hours.fri === 'Пт' ? 'Пятница' : 'Penktadienis', hours: '09:00 — 21:00' },
    { day: t.hours.sat === 'Sat' ? 'Saturday' : t.hours.sat === 'Сб' ? 'Суббота' : 'Šeštadienis', hours: '10:00 — 18:00' },
    { day: t.hours.sat === 'Sat' ? 'Sunday' : t.hours.sat === 'Сб' ? 'Воскресенье' : 'Sekmadienis', hours: t.hours.sat === 'Sat' ? 'Closed' : t.hours.sat === 'Сб' ? 'Закрыто' : 'Uždara', muted: true },
  ];

  return (
    <>
      <PageHeader
        eyebrow={t.page.locations.eyebrow}
        title={t.page.locations.title}
        accent={t.page.locations.accent}
        sub={t.page.locations.sub}
      />

      <section className="page pb-32">
        <div className="grid gap-8 lg:gap-10">
          {items.slice(0, 2).map((o, i) => (
            <LocationBlock key={o.id} office={o} index={i} t={t} hoursGrid={hoursGrid} />
          ))}
        </div>
      </section>
    </>
  );
}

function LocationBlock({
  office,
  index,
  t,
  hoursGrid,
}: {
  office: Office;
  index: number;
  t: Translations;
  hoursGrid: { day: string; hours: string; muted?: boolean }[];
}) {
  const photoUrl = PHOTOS.locationByIndex[index] ?? PHOTOS.locationByIndex[0];
  const fallback = index === 0 ? GRADIENTS.warm : GRADIENTS.amber;

  return (
    <article className="card overflow-hidden">
      <div className="grid lg:grid-cols-12">
        <div className={index % 2 === 0 ? 'lg:col-span-7' : 'lg:col-span-7 lg:order-2'}>
          <Photo
            src={photoUrl}
            fallback={fallback}
            alt={office.name}
            className="aspect-[16/10] lg:aspect-auto lg:h-full"
          />
        </div>

        <div className={`lg:col-span-5 p-8 sm:p-10 lg:p-14 flex flex-col ${index % 2 !== 0 ? 'lg:order-1' : ''}`}>
          <div className="eyebrow mb-4 tabular">№ {String(index + 1).padStart(2, '0')} · {t.page.locations.salon_label}</div>

          <h2 className="font-medium tracking-tight text-5xl sm:text-6xl mb-6">{office.name}</h2>

          <div className="space-y-3 mb-10">
            <a
              href={mapsHref(office.address)}
              target="_blank"
              rel="noopener"
              className="flex items-start gap-3 text-foreground hover:text-primary transition-colors group"
            >
              <MapPinIcon className="h-4 w-4 mt-1 text-muted-foreground/70 group-hover:text-primary shrink-0 transition-colors" />
              <span className="text-sm leading-relaxed">
                {office.address}
                <span className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mt-1 font-mono">
                  {t.page.locations.map_open}
                </span>
              </span>
            </a>
            {office.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                <a href={telHref(office.phone)} className="text-sm tabular text-foreground hover:text-primary transition-colors">
                  {formatLtPhone(office.phone)}
                </a>
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <div className="eyebrow mb-4">{t.page.locations.hours}</div>
            <dl className="space-y-2.5">
              {hoursGrid.map((h) => (
                <div key={h.day} className="flex items-baseline justify-between gap-4 py-1">
                  <dt className={`text-xs ${h.muted ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>{h.day}</dt>
                  <dd className={`tabular text-sm ${h.muted ? 'text-muted-foreground/70' : 'text-foreground'}`}>{h.hours}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-10">
            <Link href={`/book?office=${office.id}`} className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-medium hover:bg-foreground hover:text-background transition-colors duration-200">
              <span>{t.page.locations.cta}</span>
              <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
