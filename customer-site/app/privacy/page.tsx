import { PageHeader } from '@/components/shared/page-header';
import Link from 'next/link';

export const metadata = {
  title: 'Privatumo politika',
  description: 'Kaip tvarkome ir saugome jūsų asmens duomenis.',
};

// Placeholder GDPR template — covers the basics expected on a Lithuanian
// service site. Should be reviewed by counsel before going live; current
// content is a starting point, not legal advice.

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Teisinis dokumentas"
        title="Privatumo"
        accent="politika."
        description="Kaip tvarkome jūsų asmens duomenis pagal BDAR (GDPR) ir Lietuvos Respublikos asmens duomenų teisinės apsaugos įstatymą. Atnaujinta 2026 m. balandžio mėn."
        size="default"
      />

      <article className="page py-16 prose-section">
        <Section title="1. Duomenų valdytojas">
          <p>
            De Legends Barbershop (toliau — De Legends), Pilies g. 38,
            LT-01123 Vilnius. Kontaktinis el. paštas dėl asmens duomenų klausimų:{' '}
            <a href="mailto:contact@delegendsbarbershop.lt" className="text-primary hover:underline">
              contact@delegendsbarbershop.lt
            </a>
            .
          </p>
        </Section>

        <Section title="2. Kokius duomenis renkame">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong className="text-foreground">Vizito rezervacijai</strong>: vardas, pavardė,
              el. pašto adresas, telefono numeris.
            </li>
            <li>
              <strong className="text-foreground">Naujienlaiškiui</strong>: el. pašto adresas
              (su jūsų aiškiu sutikimu).
            </li>
            <li>
              <strong className="text-foreground">Techniniai duomenys</strong>: IP adresas,
              naršyklės tipas, apsilankymo laikas — naudojami tik svetainės
              veikimui užtikrinti ir saugumui.
            </li>
          </ul>
        </Section>

        <Section title="3. Kodėl renkame">
          <ul className="list-disc pl-6 space-y-2">
            <li>Vizitui patvirtinti ir priminimui išsiųsti.</li>
            <li>Susisiekimui, jei reikia perkelti ar patikslinti vizito laiką.</li>
            <li>Naujienlaiškiui — tik turintiems aiškų sutikimą; atšaukimas vienu paspaudimu.</li>
            <li>Buhalterinei apskaitai (kvitai, sąskaitos faktūros).</li>
          </ul>
        </Section>

        <Section title="4. Kiek laiko saugome">
          <p>
            Vizitų istorija saugoma 3 metus (mokesčių apskaitos įstatymo reikalavimas).
            Naujienlaiškio prenumerata — kol patys atšauksite. Techniniai
            log&apos;ai — iki 90 dienų.
          </p>
        </Section>

        <Section title="5. Jūsų teisės">
          <p>
            Pagal BDAR turite teisę: žinoti, kokius jūsų duomenis tvarkome;
            paprašyti juos taisyti; paprašyti ištrinti; gauti savo duomenis
            kompiuteriu skaitomu formatu; pateikti skundą Valstybinei duomenų
            apsaugos inspekcijai (
            <a
              href="https://vdai.lrv.lt"
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              vdai.lrv.lt
            </a>
            ).
          </p>
          <p className="mt-3">
            Visus prašymus dėl duomenų tvarkymo siųskite{' '}
            <a href="mailto:contact@delegendsbarbershop.lt" className="text-primary hover:underline">
              contact@delegendsbarbershop.lt
            </a>
            .
          </p>
        </Section>

        <Section title="6. Slapukai">
          <p>
            Naudojame tik techniškai būtinus slapukus, užtikrinančius
            svetainės veikimą (sesijos saugojimas, kalbos pasirinkimas).
            Reklaminių ar sekimo slapukų neturime.
          </p>
        </Section>

        <p className="mt-12 text-sm text-foreground/60">
          ⚠ Šis dokumentas yra šablonas. Prieš svetainės publikaciją privalo
          būti peržiūrėtas teisininko, atsižvelgiant į konkrečias verslo
          aplinkybes ir Lietuvos Respublikos teisės aktus.
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
