'use client';

import { ThemeProvider } from 'next-themes';
import { LangProvider } from '@/lib/use-t';
import type { Lang } from '@/i18n';

export function Providers({
  children,
  initialLang,
}: {
  children: React.ReactNode;
  initialLang: Lang;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <LangProvider initialLang={initialLang}>{children}</LangProvider>
    </ThemeProvider>
  );
}
