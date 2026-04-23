import { en } from './en';
import { ru } from './ru';
import { lt } from './lt';
import type { Language } from '../types';
import type { TranslationKey } from './en';

export type { TranslationKey };

export const translations: Record<Language, Record<TranslationKey, string>> = {
  en,
  ru,
  lt,
};
