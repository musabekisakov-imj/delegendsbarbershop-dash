'use client';

import { LangProvider } from '@/lib/use-t';
import type { Lang } from '@/i18n';

export function Providers({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang: Lang;
}) {
  return <LangProvider initialLang={initialLang}>{children}</LangProvider>;
}
