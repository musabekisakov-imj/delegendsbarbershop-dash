import Link from 'next/link';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/shared/page-header';
import { Photo } from '@/components/shared/photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { getServerT } from '@/lib/i18n';

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
        {/* Lead photo — full-width */}
        <Photo
          src={PHOTOS.atmosfera[0].url}
          fallback={GRADIENTS.warm}
          alt="Kirpyklos interjeras — vakaro atmosfera"
          className="aspect-[16/9] rounded-xl overflow-hidden mb-20"
        />

        {/* Manifesto — narrow column for readability */}
        <div className="prose-narrow">
          <Section eyebrow="Filosofija" title="Trys principai.">
            <Principle
              n="01"
              title="Laikas yra įrankis."
              body="Trumpiausias mūsų vizitas — trisdešimt minučių. Vidutinis — keturiasdešimt penkios. Per tą laiką nesusiformuoja vaikiškas šokių pamokos ritmas, tik kirpimas, pokalbis ir, jei reikia, tylos minutė."
            />
            <Principle
              n="02"
              title="Įrankiai yra darbo veidrodis."
              body="Kiekvieną rytą galąstos žirklės. Drabužiai praplauti. Skutimas peiliu — tik su nauju ašmeniu kiekvienam klientui. Detalės, kurių klientas dažnai nepastebi, bet visada pajunta."
            />
            <Principle
              n="03"
              title="Vienas standartas."
              body="Nesvarbu, ar užsuksite į Senamiestį, ar į Naujamiestį — kirpimą atliks tos pačios mokyklos meistras. Nesame franšizė. Esame du salonai, viena komanda."
            />
          </Section>

          <div className="h-px w-12 bg-primary mx-auto my-24" />

          <Section eyebrow="Komanda" title="Keturi vardai, vienas požiūris.">
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Aurimas pradėjo barzdaskutystėje 2014-aisiais Londone, grįžo į Vilnių
              su ramia mintimi atidaryti vietą, kurią pats norėtų lankyti. Lukas,
              Šarūnas ir Tomas prisijungė per pirmuosius mėnesius — visi su mažiausiai
              penkerių metų patirtimi, visi su skirtingais polinkiais.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Trumpas sąrašas, ilga praktika. Pasirinkite tą, su kuriuo jaučiatės gerai.
            </p>
            <Link
              href="/team"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-foreground hover:text-primary transition-colors group"
            >
              Susipažinti su meistrais
              <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
            </Link>
          </Section>

          <div className="h-px w-12 bg-primary mx-auto my-24" />

          <Section eyebrow="Vieta" title="Kodėl du salonai?">
            <p className="text-muted-foreground text-lg leading-relaxed">
              Nes Vilnius — du miestai. Senamiestis vakarop kvepia kava ir lietumi
              ant grindinio. Naujamiestis ryte skuba į Gedimino prospektą.
              Mūsų salonai — toje pačioje kavos ir lietaus distancijoje. Vienas
              standartas, dvi atmosferos.
            </p>
            <Link
              href="/locations"
              className="mt-8 inline-flex items-center gap-2 text-sm tracking-wide text-foreground hover:text-primary transition-colors group"
            >
              Žiūrėti salonus
              <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
            </Link>
          </Section>
        </div>

        {/* Closing CTA */}
        <div className="mt-32 pt-16 border-t border-border grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6">
            <div className="eyebrow mb-4">Pradėkime</div>
            <h2 className="font-bold tracking-tight text-3xl sm:text-4xl tracking-tight">
              Užsisakykite vizitą{' '}
              <span className="italic tracking-tight text-primary">per minutę.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 self-end">
            <Link href="/book" className="btn-primary-lg">
              Susitarti laiką
              <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-20 last:mb-0">
      <div className="eyebrow mb-4">{eyebrow}</div>
      <h2 className="font-bold tracking-tight text-3xl sm:text-5xl tracking-tight mb-10">{title}</h2>
      {children}
    </div>
  );
}

function Principle({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[40px_1fr] gap-6 py-8 border-b border-border last:border-b-0">
      <span className="font-bold tracking-tight text-2xl text-primary tabular pt-1">{n}</span>
      <div>
        <h3 className="font-bold tracking-tight text-2xl sm:text-3xl tracking-tight mb-3">{title}</h3>
        <p className="text-muted-foreground text-base leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
