import Link from 'next/link';
import { ArrowUpRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { ServicesGrid, OfficeFilter } from './_client';
import { publicApi } from '@/lib/api';
import { getServerT } from '@/lib/i18n';
import type { Service, Office } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.services.eyebrow.split(' · ')[0],
    description: t.page.services.sub,
  };
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { office?: string };
}) {
  const t = getServerT();
  const [services, offices] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow={t.page.services.eyebrow}
        title={t.page.services.title}
        accent={t.page.services.accent}
        sub={t.page.services.sub}
      />

      <section className="page pb-32">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          <OfficeFilter
            offices={offices}
            active={searchParams.office}
            filterLabel={t.page.services.filter}
            allLabel={t.page.services.all}
          />
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular">
              <ClockIcon className="h-3.5 w-3.5" />
              {services.length} {t.nav.services.toLowerCase()}
            </span>
            <span className="text-foreground/30">·</span>
            <span className="uppercase tracking-[0.18em] text-[10px] font-mono">
              {t.page.services.vat_note}
            </span>
          </div>
        </div>

        <ServicesGrid services={services} officeFilter={searchParams.office} />

        {/* Closing block */}
        <div className="mt-24 pt-12 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">{t.page.services.cta_eyebrow}</div>
            <h2 className="font-medium tracking-tight text-3xl sm:text-4xl">
              {t.page.services.cta_title_a}{' '}
              <span className="text-primary">{t.page.services.cta_title_accent}</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200">
              <span>{t.page.services.cta}</span>
              <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
