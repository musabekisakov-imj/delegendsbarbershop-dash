import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'De Legends Barbershop',
    short_name: 'De Legends',
    description: 'De Legends Barbershop · Vyriška kirpykla Vilniaus Senamiestyje, Pilies g. 38. Patyrę meistrai, rezervacija per minutę.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
