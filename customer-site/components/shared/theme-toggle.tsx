'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes can't read theme on the server, so we wait for hydration
  // before showing the resolved icon to avoid a hydration mismatch.
  useEffect(() => setMounted(true), []);

  const current = (theme === 'system' ? resolvedTheme : theme) ?? 'dark';
  const isDark = current === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex items-center justify-center h-7 w-7 border border-border-strong text-foreground/70 hover:text-foreground hover:bg-surface transition-colors',
        className,
      )}
    >
      {mounted ? (
        isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />
      ) : (
        // Placeholder size during SSR to avoid layout shift
        <span className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  );
}
