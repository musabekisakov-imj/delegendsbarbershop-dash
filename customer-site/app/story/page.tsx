import Link from 'next/link';
import { ArrowRightIcon, ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { getServerT } from '@/lib/i18n';
import { RevealOnScroll } from '@/components/home/home-anim';

export async function generateMetadata() {
  const t = getServerT();
  return {
    title: t.page.story.eyebrow.split(' · ')[0],
    description: t.page.story.sub,
  };
}

export default function StoryPage() {
  const t = getServerT();
  return (
    <>
      <PageHeader
        eyebrow={t.page.story.eyebrow}
        title={t.page.story.title}
        accent={t.page.story.accent}
        sub={t.page.story.sub}
      />

      <section className="page pb-32">
        {/* Lead photo — full-width with caption overlay */}
        <RevealOnScroll>
          <figure className="relative aspect-[16/9] rounded-xl overflow-hidden mb-24">
            <Photo
              src={PHOTOS.storyByKey.lead}
              fallback={GRADIENTS.warm}
              alt={t.page.story.caption_lead}
              className="absolute inset-0"
            />
            <figcaption className="absolute bottom-4 left-4 z-10 eyebrow text-foreground/80 bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded">
              {t.page.story.caption_lead}
            </figcaption>
          </figure>
        </RevealOnScroll>

        {/* Manifesto — narrow column for readability */}
        <RevealOnScroll>
          <div className="prose-narrow">
            <Section eyebrow={t.page.story.principles_eyebrow} title={t.page.story.principles_title}>
              <Principle n="01" title={t.page.story.p1_title} body={t.page.story.p1_body} />
              <Principle n="02" title={t.page.story.p2_title} body={t.page.story.p2_body} />
              <Principle n="03" title={t.page.story.p3_title} body={t.page.story.p3_body} />
            </Section>
          </div>
        </RevealOnScroll>

        {/* Team section photo — sits between the prose blocks */}
        <RevealOnScroll>
          <figure className="relative aspect-[21/9] rounded-xl overflow-hidden my-24">
            <Photo
              src={PHOTOS.storyByKey.team}
              fallback={GRADIENTS.amber}
              alt={t.page.story.caption_team}
              className="absolute inset-0"
            />
            <figcaption className="absolute bottom-4 left-4 z-10 eyebrow text-foreground/80 bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded">
              {t.page.story.caption_team}
            </figcaption>
          </figure>
        </RevealOnScroll>

        <div className="prose-narrow">
          <Section eyebrow={t.page.story.team_eyebrow} title={t.page.story.team_title}>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              {t.page.story.team_body1}
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t.page.story.team_body2}
            </p>
            <Link
              href="/team"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-foreground hover:text-primary transition-colors group"
            >
              {t.page.story.team_cta}
              <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
            </Link>
          </Section>
        </div>

        {/* Vieta photo — third anchor */}
        <figure className="relative aspect-[21/9] rounded-xl overflow-hidden my-24">
          <Photo
            src={PHOTOS.storyByKey.vieta}
            fallback={GRADIENTS.cool}
            alt={t.page.story.caption_vieta}
            className="absolute inset-0"
          />
          <figcaption className="absolute bottom-4 left-4 z-10 eyebrow text-foreground/80 bg-background/40 backdrop-blur-sm px-3 py-1.5 rounded">
            {t.page.story.caption_vieta}
          </figcaption>
        </figure>

        <div className="prose-narrow">
          <Section eyebrow={t.page.story.vieta_eyebrow} title={t.page.story.vieta_title}>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t.page.story.vieta_body}
            </p>
            <Link
              href="/locations"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-foreground hover:text-primary transition-colors group"
            >
              {t.page.story.vieta_cta}
              <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
            </Link>
          </Section>
        </div>

        {/* Closing CTA */}
        <RevealOnScroll>
          <div className="mt-32 pt-16 border-t border-border grid lg:grid-cols-12 gap-10">
            <div className="lg:col-span-6">
              <div className="eyebrow mb-4">{t.page.story.cta_eyebrow}</div>
              <h2 className="font-bold tracking-tight text-3xl sm:text-4xl">
                {t.page.story.cta_title_a}{' '}
                <span className="italic tracking-tight text-primary">{t.page.story.cta_title_accent}</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:col-start-8 self-end">
              <Link
                href="/book"
                className="inline-flex items-center bg-primary text-primary-foreground pl-7 py-0 pr-0 text-base font-semibold hover:bg-foreground hover:text-background transition-colors duration-200"
              >
                <span>{t.page.story.cta}</span>
                <span className="border-l border-black/30 p-4 ml-7 inline-flex items-center">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-20 last:mb-0">
      <div className="eyebrow mb-4">{eyebrow}</div>
      <h2 className="font-bold tracking-tight text-3xl sm:text-5xl mb-10">{title}</h2>
      {children}
    </div>
  );
}

function Principle({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-6 py-8 border-b border-border last:border-b-0">
      <span className="font-bold tracking-tight text-2xl text-primary tabular pt-1">{n}</span>
      <div>
        <h3 className="font-bold tracking-tight text-2xl sm:text-3xl mb-3">{title}</h3>
        <p className="text-muted-foreground text-base leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
