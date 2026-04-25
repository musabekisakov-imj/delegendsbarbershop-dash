// Photo manifest — single source of truth for image URLs across the site.
//
// CURRENT: Curated Unsplash photos with a barbershop / craft / interior theme.
// SWAP: When the salon provides real photos, replace these URLs with paths to
//       /public/photos/*.jpg (and drop the files into customer-site/public/photos/).
//
// All photos are rendered with a CSS gradient fallback behind them, so a broken
// URL gracefully degrades to a dark warm gradient instead of a broken icon.
//
// A site-wide filter (brightness(0.65) contrast(1.05) sepia(0.15)) is applied
// in components to unify any photo into the HOURS palette.

export const PHOTOS = {
  // Full-bleed hero — moody barbershop interior. Sits behind type with overlay.
  hero: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=2400&q=80&auto=format&fit=crop',

  // 4-up "Atmosfera" magazine spread between services and locations.
  atmosfera: [
    {
      url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1400&q=80&auto=format&fit=crop',
      caption: 'Įrankiai · Rankų darbo',
      alt: 'Klasikinės kirpyklos žirklės ir šukos ant medinio paviršiaus',
    },
    {
      url: 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?w=1400&q=80&auto=format&fit=crop',
      caption: 'Procesas · Kruopštumas',
      alt: 'Kirpėjas dirba prie kliento',
    },
    {
      url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1400&q=80&auto=format&fit=crop',
      caption: 'Detalė · Barzdos kontūras',
      alt: 'Barzdos formavimas — artimas kadras',
    },
    {
      url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=1400&q=80&auto=format&fit=crop',
      caption: 'Vieta · Lemputės šviesa',
      alt: 'Kirpyklos interjeras vakarop, vienas šviesos židinys',
    },
  ],

  // Per-office hero photos. Mapped by index in the offices array (first = 0, etc.).
  // The fallback gradient differs per index so even without photos, each office
  // has a distinct visual identity.
  locationByIndex: [
    'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=1800&q=80&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=1800&q=80&auto=format&fit=crop',
  ],

  // Filter applied to every photographic surface — unifies palette regardless of source.
  filter: 'brightness(0.62) contrast(1.08) sepia(0.18) saturate(0.85)',
} as const;

// Gradient fallbacks — shown when a photo URL fails to load. Two distinct
// looks so the home page doesn't repeat the same gradient four times.
export const GRADIENTS = {
  hero: 'radial-gradient(ellipse 70% 50% at 30% 30%, rgba(232,72,45,0.20), transparent 60%), linear-gradient(160deg, #1A1815 0%, #0E0D0B 60%, #0E0D0B 100%)',
  warm: 'linear-gradient(135deg, #2A2622 0%, #0E0D0B 70%), radial-gradient(ellipse at top right, rgba(232,72,45,0.18), transparent 60%)',
  cool: 'linear-gradient(135deg, #171511 0%, #0E0D0B 60%), radial-gradient(ellipse at bottom left, rgba(244,236,219,0.06), transparent 60%)',
  earth: 'linear-gradient(160deg, #3A352D 0%, #0E0D0B 70%), radial-gradient(ellipse at center, rgba(232,72,45,0.10), transparent 70%)',
  amber: 'linear-gradient(140deg, #26221C 0%, #0E0D0B 60%), radial-gradient(ellipse at top, rgba(168,118,47,0.18), transparent 60%)',
} as const;
