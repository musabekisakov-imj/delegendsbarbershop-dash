import Link from 'next/link';
import { ArrowUpRightIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { ServicesGrid, OfficeFilter } from './_client';
import { publicApi } from '@/lib/api';
import type { Service, Office } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Paslaugos',
  description: 'Pilnas paslaugų sąrašas. Vyriški kirpimai, barzdos, skutimai.',
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { office?: string };
}) {
  const [services, offices] = await Promise.all([
    publicApi.services().catch(() => [] as Service[]),
    publicApi.offices().catch(() => [] as Office[]),
  ]);

  // Build category list for the future-friendly filter — derive from data.
  const categoryNames = Array.from(
    new Set(services.map((s) => s.category?.name).filter((n): n is string => !!n)),
  );

  return (
    <>
      <PageHeader
        eyebrow="Kainoraštis · Visos paslaugos"
        title="Tai, ką darome."
        accent="Be lozungų."
        sub="Trumpas sąrašas, ilga praktika. Visos kainos eurais — be paslėptų mokesčių, be staigmenų sąskaitoje."
      />

      <section className="page pb-32">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          <OfficeFilter offices={offices} active={searchParams.office} />
          <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 tabular">
              <ClockIcon className="h-3.5 w-3.5" />
              {services.length} paslaugos
            </span>
            <span className="text-foreground/30">·</span>
            <span className="uppercase tracking-[0.18em] text-[10px] font-mono">
              Visos kainos su PVM
            </span>
          </div>
        </div>

        <ServicesGrid services={services} officeFilter={searchParams.office} />

        {/* Closing block */}
        <div className="mt-24 pt-12 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Pasirengę?</div>
            <h2 className="font-bold tracking-tight text-3xl sm:text-4xl tracking-tight">
              Pasirinkite paslaugą ir{' '}
              <span className="text-primary">susitarkime laiką.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="btn-primary-lg">
              Pradėti rezervaciją
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
