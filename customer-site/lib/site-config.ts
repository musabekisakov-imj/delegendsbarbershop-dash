// Centralised site config — pulls from env vars so dev never accidentally
// ships fictional data to production. Every value has a safe placeholder so
// the site renders during local dev even before the real values are set.
//
// All `NEXT_PUBLIC_*` vars are inlined into the client bundle at build time,
// so changing them requires a redeploy. That's the right tradeoff for static
// company info that changes once a year.

export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://delegendsbarbershop.lt',
  name: process.env.NEXT_PUBLIC_SHOP_NAME ?? 'De Legends Barbershop',
  shortName: process.env.NEXT_PUBLIC_SHOP_SHORT ?? 'De Legends',
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@delegendsbarbershop.lt',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://instagram.com/delegendsbarbershop',
  // Legal — leave empty in dev so the placeholder shows; populate per env.
  registration: process.env.NEXT_PUBLIC_REG_NUMBER ?? '',
  vat: process.env.NEXT_PUBLIC_VAT_NUMBER ?? '',
  // Two Vilnius offices — Senamiestis flagship + Naujamiestis branch.
  offices: [
    {
      key: 'senamiestis',
      name: 'Senamiestis',
      address: process.env.NEXT_PUBLIC_OFFICE_1_ADDRESS ?? 'Pilies g. 38, Vilnius',
      postalCode: process.env.NEXT_PUBLIC_OFFICE_1_POSTAL ?? 'LT-01123',
      phone: process.env.NEXT_PUBLIC_OFFICE_1_PHONE ?? '+37066375648',
      latitude: Number(process.env.NEXT_PUBLIC_OFFICE_1_LAT ?? 54.6802),
      longitude: Number(process.env.NEXT_PUBLIC_OFFICE_1_LNG ?? 25.2884),
    },
    {
      key: 'naujamiestis',
      name: 'Naujamiestis',
      address: process.env.NEXT_PUBLIC_OFFICE_2_ADDRESS ?? 'Gedimino pr. 45, Vilnius',
      postalCode: process.env.NEXT_PUBLIC_OFFICE_2_POSTAL ?? 'LT-01103',
      phone: process.env.NEXT_PUBLIC_OFFICE_2_PHONE ?? '+37060000002',
      latitude: Number(process.env.NEXT_PUBLIC_OFFICE_2_LAT ?? 54.6892),
      longitude: Number(process.env.NEXT_PUBLIC_OFFICE_2_LNG ?? 25.2710),
    },
  ],
} as const;

/**
 * Format the legal company string for the footer. Returns empty if reg/VAT
 * aren't configured — the footer should fall back to a shorter line.
 */
export function legalLine(year: number): string {
  const parts: string[] = [`© ${year} ${SITE.name}`];
  if (SITE.registration) parts.push(`Reg. nr. ${SITE.registration}`);
  if (SITE.vat) parts.push(`PVM ${SITE.vat}`);
  return parts.join(' · ');
}
