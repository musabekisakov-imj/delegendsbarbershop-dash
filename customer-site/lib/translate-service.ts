// Service name + description + category translation.
//
// Service names live in the database (Lithuanian), but the customer site
// supports EN and RU. This helper maps the actual De Legends Barbershop
// catalog (Pro / Pro Max / Jaunikis / LEGENDS VIP / etc.) to its EN/RU
// equivalents. Falls through to the original LT name if not in the map —
// safe degradation for new services added on the dashboard.

import type { Lang } from '@/i18n';

const NAME_MAP: Record<string, { en: string; ru: string }> = {
  // Cuts
  'Kirpimas Pro':       { en: 'Cut Pro',           ru: 'Стрижка Pro' },
  'Kirpimas Pro Max':   { en: 'Cut Pro Max',       ru: 'Стрижка Pro Max' },
  'Kirpimas Pro Maxx':  { en: 'Cut Pro Maxx',      ru: 'Стрижка Pro Maxx' },
  'Galvos skutimas':    { en: 'Head shave',        ru: 'Бритьё головы' },
  'Vaikiškas kirpimas': { en: "Children's cut",    ru: 'Детская стрижка' },
  // Beard
  'Barzda':             { en: 'Beard',             ru: 'Борода' },
  'Barzda Pro':         { en: 'Beard Pro',         ru: 'Борода Pro' },
  'Barzda Pro Max':     { en: 'Beard Pro Max',     ru: 'Борода Pro Max' },
  // Combo
  'Kirpimas + barzda':  { en: 'Cut + beard',       ru: 'Стрижка + борода' },
  // Wedding
  'Jaunikis':           { en: 'Groom',             ru: 'Жених' },
  'Klasikinis jaunikis':{ en: 'Classic groom',     ru: 'Классический жених' },
  'Jaunikis Plius':     { en: 'Groom Plus',        ru: 'Жених Плюс' },
  'LEGENDS VIP':        { en: 'LEGENDS VIP',       ru: 'LEGENDS VIP' },
  // Wellness
  'Veido procedūra':    { en: 'Facial',            ru: 'Уход за лицом' },
  'Veido procedūra X':  { en: 'Facial X',          ru: 'Уход за лицом X' },
  'Galvos masažas':     { en: 'Head massage',      ru: 'Массаж головы' },
  'Ausų valymas vašku': { en: 'Ear candling',      ru: 'Чистка ушей воском' },

  // Legacy names from earlier seed — kept so old bookmarked URLs don't 404
  'Vyriškas kirpimas':  { en: "Men's haircut",     ru: 'Мужская стрижка' },
  'Barzdos formavimas': { en: 'Beard trim',        ru: 'Стрижка бороды' },
  'Skutimas peiliu':    { en: 'Razor shave',       ru: 'Бритьё опасной бритвой' },
};

const DESC_MAP: Record<string, { en: string; ru: string }> = {
  'Klasikinis arba modernus':  { en: 'Classic or modern',         ru: 'Классическая или современная' },
  'Su karštu rankšluosčiu':    { en: 'With hot towel',            ru: 'С горячим полотенцем' },
  'Karštas rankšluostis':      { en: 'Hot towel finish',          ru: 'С горячим полотенцем' },
  'Kombinuota paslauga':       { en: 'Combined service',          ru: 'Комбинированная услуга' },
  'Tradicinis skutimas':       { en: 'Traditional shave',         ru: 'Традиционное бритьё' },
};

const CATEGORY_MAP: Record<string, { en: string; ru: string }> = {
  'Kirpimai':       { en: 'Haircuts',         ru: 'Стрижки' },
  'Barzdos':        { en: 'Beard',            ru: 'Борода' },
  'Kombinacijos':   { en: 'Combinations',     ru: 'Комбинации' },
  'Skutimai':       { en: 'Shaves',           ru: 'Бритьё' },
  'Vestuvės':       { en: 'Wedding',          ru: 'Свадьба' },
  'Veido ir kūno':  { en: 'Face & body',      ru: 'Лицо и тело' },
};

export function translateServiceName(name: string, lang: Lang): string {
  if (lang === 'lt') return name;
  return NAME_MAP[name]?.[lang] ?? name;
}

export function translateServiceDescription(desc: string, lang: Lang): string {
  if (lang === 'lt' || !desc) return desc;
  return DESC_MAP[desc]?.[lang] ?? desc;
}

export function translateCategory(name: string, lang: Lang): string {
  if (lang === 'lt') return name;
  return CATEGORY_MAP[name]?.[lang] ?? name;
}
