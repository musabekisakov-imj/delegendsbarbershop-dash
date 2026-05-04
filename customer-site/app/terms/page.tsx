import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';

export const metadata = {
  title: 'Naudojimo taisyklės',
  description: 'Vizito rezervacijos ir paslaugų teikimo taisyklės.',
};

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Teisinis dokumentas"
        title="Naudojimo"
        accent="taisyklės."
        description="Šios taisyklės reguliuoja vizitų rezervaciją per delegendsbarbershop.lt svetainę ir paslaugų teikimą De Legends Barbershop salone. Atnaujinta 2026 m. balandžio mėn."
        size="default"
      />

      <article className="page py-16 prose-section">
        <Section title="1. Vizito rezervacija">
          <p>
            Vizito rezervacija įvykdoma online per svetainę. Patvirtinimas
            siunčiamas el. paštu per minutę. Mokėjimas atliekamas vietoje
            (grynaisiais arba kortele).
          </p>
        </Section>

        <Section title="2. Atšaukimas ir perkėlimas">
          <p>
            Vizitą galima atšaukti ar perkelti paskambinus į saloną iki
            12 valandų prieš vizito pradžią be jokių mokesčių.
          </p>
          <p className="mt-3">
            Vėluojant į vizitą daugiau nei 15 minučių, rezervacija gali būti
            atšaukta — tai užtikrina sklandų darbą kitiems klientams.
          </p>
        </Section>

        <Section title="3. Kainos ir mokėjimas">
          <p>
            Visos kainoraštyje nurodytos kainos yra galutinės su PVM (21%).
            Mokėti galima grynaisiais pinigais arba banko kortele vietoje.
            Pageidaujant, sąskaitą faktūrą siunčiame el. paštu.
          </p>
        </Section>

        <Section title="4. Vaikų vizitai">
          <p>
            Vaikai iki 12 metų aptarnaujami tik dalyvaujant vienam iš tėvų
            arba globėjui.
          </p>
        </Section>

        <Section title="5. Atsakomybė">
          <p>
            De Legends atsako už paslaugų kokybę pagal galiojančius Lietuvos
            Respublikos teisės aktus. Pretenzijos dėl paslaugų pateikiamos
            iškart po vizito arba per 3 dienas el. paštu.
          </p>
        </Section>

        <Section title="6. Asmens duomenys">
          <p>
            Asmens duomenys tvarkomi pagal{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              privatumo politiką
            </Link>
            . Renkami minimaliai — tik tiek, kiek reikia vizitui patvirtinti
            ir buhalterinei apskaitai.
          </p>
        </Section>

        <Section title="7. Ginčų sprendimas">
          <p>
            Visi ginčai pirmiausia sprendžiami derybų keliu, susisiekus
            adresu contact@delegendsbarbershop.lt. Nepavykus susitarti, ginčai sprendžiami
            Lietuvos Respublikos teismuose. Vartotojai taip pat gali kreiptis
            į Valstybinę vartotojų teisių apsaugos tarnybą (
            <a
              href="https://vvtat.lt"
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              vvtat.lt
            </a>
            ).
          </p>
        </Section>

        <p className="mt-12 text-sm text-foreground/60">
          ⚠ Šis dokumentas yra šablonas. Prieš svetainės publikaciją privalo
          būti peržiūrėtas teisininko.
        </p>

        <div className="mt-10 pt-6 border-t border-border">
          <Link href="/" className="text-sm text-primary hover:underline">
            ← Į pradžią
          </Link>
        </div>
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-medium tracking-tight mb-4">{title}</h2>
      <div className="text-foreground/70 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
