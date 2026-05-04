import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { getServerT } from '@/lib/i18n';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.faq.eyebrow.split(' · ')[0],
    description: t.page.faq.sub,
  };
}

export default function FaqPage() {
  const t = getServerT();
  return (
    <>
      <PageHeader
        eyebrow={t.page.faq.eyebrow}
        title={t.page.faq.title}
        accent={t.page.faq.accent}
        sub={t.page.faq.sub}
      />

      <section className="page pb-32">
        <ol className="prose-narrow border-t border-border">
          {t.page.faq.items.map((item, i) => (
            <li key={i} className="grid grid-cols-[40px_1fr] gap-6 py-10 border-b border-border list-none">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary tabular pt-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h2 className="font-semibold tracking-tight text-xl sm:text-2xl text-foreground mb-3">
                  {item.q}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-24 pt-12 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">{t.page.faq.cta_eyebrow}</div>
            <h2 className="font-semibold tracking-tight text-3xl sm:text-4xl">
              {t.page.faq.cta_title_a}{' '}
              <span className="text-primary">{t.page.faq.cta_title_accent}</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-semibold hover:bg-foreground hover:text-background transition-colors duration-200">
              <span>{t.page.faq.cta}</span>
              <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                <ArrowRightIcon className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
