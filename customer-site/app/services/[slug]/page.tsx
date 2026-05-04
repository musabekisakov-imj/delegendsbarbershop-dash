import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRightIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { slugify } from '@/lib/slug';
import { SITE } from '@/lib/site-config';
import { getServerT, getServerLang } from '@/lib/i18n';
import {
  translateServiceName,
  translateServiceDescription,
  translateCategory,
} from '@/lib/translate-service';
import type { Service } from '@/lib/types';

export const dynamic = 'force-dynamic';

async function findBySlug(slug: string): Promise<Service | null> {
  const services = await publicApi.services().catch(() => [] as Service[]);
  return services.find((s) => slugify(s.name) === slug) ?? null;
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const t = getServerT();
  const lang = getServerLang();
  const service = await findBySlug(params.slug);
  if (!service) return { title: t.page.services.title };
  const name = translateServiceName(service.name, lang);
  return {
    title: `${name} · €${service.price}`,
    description: translateServiceDescription(service.description, lang) || t.page.services.sub,
  };
}

export default async function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const t = getServerT();
  const lang = getServerLang();
  const service = await findBySlug(params.slug);
  if (!service) notFound();

  const name = translateServiceName(service.name, lang);
  const description = service.description ? translateServiceDescription(service.description, lang) : '';
  const category = service.category?.name ? translateCategory(service.category.name, lang) : t.nav.services;
  const photoUrl = PHOTOS.serviceByName[service.name];

  // Schema.org Service node — links back to the parent salon for richer SERP.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description: description || name,
    provider: { '@id': `${SITE.url}#org` },
    serviceType: category,
    areaServed: 'Vilnius',
    offers: {
      '@type': 'Offer',
      price: service.price.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${SITE.url}/book?service=${service.id}`,
    },
  };

  // Sibling services in the same office, for the "explore more" rail.
  const allServices = await publicApi.services().catch(() => [] as Service[]);
  const siblings = allServices.filter((s) => s.id !== service.id && s.officeId === service.officeId).slice(0, 3);

  return (
    <>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>

      <PageHeader
        eyebrow={`${category} · €${service.price}`}
        title={name}
        accent={`${service.duration} ${t.ui.duration_min}`}
        sub={description}
      />

      <section className="page pb-32">
        {/* Hero photo */}
        <figure className="relative aspect-[16/9] rounded-xl overflow-hidden mb-16">
          {photoUrl ? (
            <Photo src={photoUrl} fallback={GRADIENTS.warm} alt={name} className="absolute inset-0" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-rose-500 to-purple-600" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/85 to-transparent" />
        </figure>

        {/* Meta strip */}
        <div className="grid sm:grid-cols-3 gap-6 mb-16 pb-10 border-b border-border">
          <Meta label={t.booking.sum_price} value={`€${service.price.toFixed(2)}`} />
          <Meta
            label={t.booking.duration_visit}
            value={`${service.duration} ${t.ui.duration_min}`}
            icon={<ClockIcon className="h-4 w-4" />}
          />
          <Meta label={t.page.services.vat_note} value={category} />
        </div>

        {/* CTA */}
        <div className="mb-24 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <h2 className="font-semibold tracking-tight text-3xl sm:text-4xl">
              {t.page.services.cta_title_a}{' '}
              <span className="text-primary">{t.page.services.cta_title_accent}</span>
            </h2>
          </div>
          <div className="lg:col-span-5 self-end">
            <Link
              href={`/book?service=${service.id}`}
              className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-semibold hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              <span>{t.page.services.cta}</span>
              <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Siblings */}
        {siblings.length > 0 && (
          <div className="border-t border-border pt-10">
            <div className="eyebrow mb-6">{t.services_preview.eyebrow}</div>
            <div className="grid sm:grid-cols-3 gap-4">
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  href={`/services/${slugify(s.name)}`}
                  className="card card-hover p-6 flex flex-col h-full group"
                >
                  <span className="eyebrow mb-3">
                    {s.category?.name ? translateCategory(s.category.name, lang) : ''}
                  </span>
                  <span className="font-bold tracking-tight text-2xl mb-3 group-hover:text-primary transition-colors">
                    {translateServiceName(s.name, lang)}
                  </span>
                  <span className="mt-auto pt-4 border-t border-border tabular text-foreground font-semibold">
                    €{s.price}
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
              >
                <MapPinIcon className="h-3.5 w-3.5" />
                {t.services_preview.cta}
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function Meta({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-2 inline-flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="font-bold tracking-tight text-2xl text-foreground tabular">{value}</div>
    </div>
  );
}
