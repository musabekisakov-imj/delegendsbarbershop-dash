import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { TeamGrid } from './_client';
import { publicApi } from '@/lib/api';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { getServerT } from '@/lib/i18n';
import type { PublicStaff } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.team.eyebrow.split(' · ')[0],
    description: t.page.team.sub,
  };
}

export default async function TeamPage() {
  const t = getServerT();
  const staff = await publicApi.staff().catch(() => [] as PublicStaff[]);

  return (
    <>
      <PageHeader
        eyebrow={t.page.team.eyebrow}
        title={t.page.team.title}
        accent={t.page.team.accent}
        sub={t.page.team.sub}
      />

      <section className="page pb-32">
        <TeamGrid staff={staff} />

        {/* Atmosphere photo strip — anchors the team in a real space */}
        <figure className="relative aspect-[21/9] rounded-xl overflow-hidden mt-24">
          <Photo
            src={PHOTOS.teamAtmosphere}
            fallback={GRADIENTS.warm}
            alt={t.page.team.atmosphere_title}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/40 to-transparent" />
          <figcaption className="absolute bottom-8 left-8 right-8 lg:bottom-12 lg:left-12 max-w-xl">
            <div className="eyebrow mb-3 text-foreground/85">{t.page.team.atmosphere_eyebrow}</div>
            <h3 className="font-bold tracking-tight text-2xl sm:text-3xl lg:text-4xl text-foreground leading-tight">
              {t.page.team.atmosphere_title}
            </h3>
          </figcaption>
        </figure>

        <div className="mt-24 pt-12 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">{t.page.team.cta_eyebrow}</div>
            <h2 className="font-medium tracking-tight text-3xl sm:text-4xl">
              {t.page.team.cta_title_a}{' '}
              <span className="text-primary">{t.page.team.cta_title_accent}</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-medium hover:bg-foreground hover:text-background transition-colors duration-200">
              <span>{t.page.team.cta}</span>
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
