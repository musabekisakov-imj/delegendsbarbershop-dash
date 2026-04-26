// Server-side i18n helper. Reads the language preference from a cookie
// and returns the matching translation dict for use in server components.
//
// Client components should use `useT()` from `lib/use-t.ts` instead.

import { cookies } from 'next/headers';
import { dict, type Lang, type Translations, LANGS } from '@/i18n';
import { LANG_COOKIE } from './lang-cookie';

export { LANG_COOKIE };

export function getServerLang(): Lang {
  const value = cookies().get(LANG_COOKIE)?.value;
  if (value && (LANGS as readonly string[]).includes(value)) {
    return value as Lang;
  }
  return 'lt';
}

export function getServerT(): Translations {
  return dict(getServerLang());
}
