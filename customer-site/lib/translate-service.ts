// Service name + description translation.
//
// Service names live in the database (Lithuanian), but the customer site
// supports EN and RU. This helper maps known LT names to their EN/RU
// equivalents. Falls through to the original LT name if not in the map —
// safe degradation for new services added on the dashboard.

import type { Lang } from '@/i18n';

const NAME_MAP: Record<string, { en: string; ru: string }> = {
  'Vyriškas kirpimas':     { en: "Men's haircut",      ru: 'Мужская стрижка' },
  'Barzdos formavimas':    { en: 'Beard trim',         ru: 'Стрижка бороды' },
  'Kirpimas + barzda':     { en: 'Cut + beard',        ru: 'Стрижка + борода' },
  'Skutimas peiliu':       { en: 'Razor shave',        ru: 'Бритьё опасной бритвой' },
  'Vaiko kirpimas':        { en: "Children's haircut", ru: 'Детская стрижка' },
};

const DESC_MAP: Record<string, { en: string; ru: string }> = {
  'Klasikinis arba modernus':  { en: 'Classic or modern',         ru: 'Классическая или современная' },
  'Su karštu rankšluosčiu':    { en: 'With hot towel',            ru: 'С горячим полотенцем' },
  'Karštas rankšluostis':      { en: 'Hot towel finish',          ru: 'С горячим полотенцем' },
  'Kombinuota paslauga':       { en: 'Combined service',          ru: 'Комбинированная услуга' },
  'Tradicinis skutimas':       { en: 'Traditional shave',         ru: 'Традиционное бритьё' },
};

const CATEGORY_MAP: Record<string, { en: string; ru: string }> = {
  'Kirpimai':       { en: 'Haircuts',     ru: 'Стрижки' },
  'Barzdos':        { en: 'Beard',        ru: 'Борода' },
  'Kombinacijos':   { en: 'Combinations', ru: 'Комбинации' },
  'Skutimai':       { en: 'Shaves',       ru: 'Бритьё' },
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
