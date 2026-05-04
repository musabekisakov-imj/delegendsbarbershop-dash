// Schema.org HairSalon JSON-LD — fed to Google for rich Local Pack listings.
// Two locations means two HairSalon entities; the overarching Organization
// node ties them together. All values come from lib/site-config so dev never
// ships fictional data to production.

import { SITE } from '@/lib/site-config';

const HOURS_WEEK = {
  '@type': 'OpeningHoursSpecification' as const,
  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  opens: '09:00',
  closes: '20:00',
};
const HOURS_FRI = {
  '@type': 'OpeningHoursSpecification' as const,
  dayOfWeek: 'Friday',
  opens: '09:00',
  closes: '21:00',
};
const HOURS_SAT = {
  '@type': 'OpeningHoursSpecification' as const,
  dayOfWeek: 'Saturday',
  opens: '10:00',
  closes: '18:00',
};

const SHOP_DESC =
  'De Legends Barbershop · Vyriška kirpykla Vilniaus Senamiestyje, Pilies g. 38. Patyrę meistrai, rezervacija per minutę.';

const LOCATIONS = SITE.offices.map((o) => {
  const [streetAddress] = o.address.split(',');
  return {
    '@type': 'HairSalon',
    '@id': `${SITE.url}/locations#${o.key}`,
    name: `${SITE.name} · ${o.name}`,
    url: `${SITE.url}/locations`,
    telephone: o.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: streetAddress.trim(),
      postalCode: o.postalCode,
      addressLocality: 'Vilnius',
      addressCountry: 'LT',
    },
    geo: { '@type': 'GeoCoordinates', latitude: o.latitude, longitude: o.longitude },
    openingHoursSpecification: [HOURS_WEEK, HOURS_FRI, HOURS_SAT],
    priceRange: '€€',
    parentOrganization: { '@id': `${SITE.url}#org` },
  };
});

const ORG = {
  '@type': 'Organization',
  '@id': `${SITE.url}#org`,
  name: SITE.name,
  url: SITE.url,
  logo: `${SITE.url}/favicon.svg`,
  description: SHOP_DESC,
  sameAs: SITE.instagram ? [SITE.instagram] : [],
};

const GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [ORG, ...LOCATIONS],
};

export function LocalBusinessJsonLd() {
  return <script type="application/ld+json">{JSON.stringify(GRAPH)}</script>;
}
