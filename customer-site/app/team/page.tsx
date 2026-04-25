import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { TeamGrid } from './_client';
import { publicApi } from '@/lib/api';
import type { PublicStaff } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meistrai',
  description: 'Patyrę barzdaskutiniai, kiekvienas dirba bent penkerius metus.',
};

export default async function TeamPage() {
  const staff = await publicApi.staff().catch(() => [] as PublicStaff[]);

  return (
    <>
      <PageHeader
        eyebrow="Meistrai · Mūsų komanda"
        title="Patyrę rankos."
        accent="Be skubėjimo."
        sub="Kiekvienas mūsų meistras dirba bent penkerius metus. Trumpas sąrašas, kruopščiai suformuotas. Pasirinkite tą, su kuriuo norite leisti keturiasdešimt penkias minutes."
      />

      <section className="editorial pb-32">
        <TeamGrid staff={staff} />

        <div className="mt-24 pt-12 border-t border-hairline grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Pasirinkite vienąi</div>
            <h2 className="display text-3xl sm:text-4xl tracking-snug">
              Užsisakykite vizitą pas{' '}
              <span className="text-oxblood">jums tinkamą meistrą.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="btn-mark-lg">
              Pradėti rezervaciją
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
