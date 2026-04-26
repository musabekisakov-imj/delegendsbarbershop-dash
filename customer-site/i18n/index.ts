import { lt } from './lt';
import { en } from './en';
import { ru } from './ru';
import type { Lang, Translations } from './types';

export * from './types';

const DICTS: Record<Lang, Translations> = { lt, en, ru };

export function dict(lang: Lang): Translations {
  return DICTS[lang] ?? lt;
}
