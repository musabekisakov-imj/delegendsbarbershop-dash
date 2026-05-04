import Link from 'next/link';
import { ArrowRightIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { formatLtPhone, telHref } from '@/lib/lt';
import { getServerT } from '@/lib/i18n';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.gifts.eyebrow.split(' · ')[0],
    description: t.page.gifts.sub,
  };
}

export default function GiftCardsPage() {
  const t = getServerT();
  return (
    <>
      <PageHeader
        eyebrow={t.page.gifts.eyebrow}
        title={t.page.gifts.title}
        accent={t.page.gifts.accent}
        sub={t.page.gifts.sub}
      />

      <section className="page pb-32">
        {/* Lead photo strip */}
        <figure className="relative aspect-[21/9] rounded-xl overflow-hidden mb-20">
          <Photo
            src={PHOTOS.atmosfera[0].url}
            fallback={GRADIENTS.amber}
            alt={t.page.gifts.title}
            className="absolute inset-0"
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-background/85 via-background/30 to-transparent" />
        </figure>

        <div className="grid lg:grid-cols-12 gap-12">
          {/* Denominations */}
          <div className="lg:col-span-7">
            <div className="eyebrow mb-6">{t.page.gifts.denoms_label}</div>
            <div className="grid sm:grid-cols-3 gap-4">
              {t.page.gifts.denoms.map((d) => (
                <div key={d.value} className="card p-7 flex flex-col">
                  <span className="font-bold tracking-tight text-5xl text-primary tabular mb-3">
                    {d.value}
                  </span>
                  <span className="text-sm text-muted-foreground leading-relaxed">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="lg:col-span-5">
            <div className="eyebrow mb-6">{t.page.gifts.detail_label}</div>
            <ul className="space-y-4">
              {t.page.gifts.details.map((d, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary tabular pt-1.5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closing block */}
        <div className="mt-24 pt-12 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div className="eyebrow mb-4">{t.page.gifts.cta_eyebrow}</div>
            <h2 className="font-semibold tracking-tight text-3xl sm:text-4xl mb-3">
              {t.page.gifts.cta_title}
            </h2>
            <p className="text-muted-foreground text-base leading-relaxed max-w-md">
              {t.page.gifts.cta_body}
            </p>
          </div>
          <div className="lg:col-span-5 self-end">
            <a
              href={telHref('+37060000001')}
              className="inline-flex items-center bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm font-semibold hover:bg-foreground hover:text-background transition-colors duration-200"
            >
              <span className="inline-flex items-center gap-2">
                <PhoneIcon className="h-4 w-4" />
                {t.page.gifts.cta_phone}
              </span>
              <span className="border-l border-black/30 p-3 ml-5 inline-flex items-center">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </a>
            <div className="mt-2 text-xs text-foreground/55 tabular font-mono">
              {formatLtPhone('+37060000001')}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
