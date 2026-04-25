'use client';

import { cn } from '@/lib/cn';

const STEPS = [
  { n: 1, label: 'Paslauga' },
  { n: 2, label: 'Meistras' },
  { n: 3, label: 'Laikas' },
  { n: 4, label: 'Patvirtinimas' },
];

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-3 sm:gap-6 text-xs uppercase tracking-eyebrow text-ink-muted">
      {STEPS.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border tabular text-[11px]',
                active && 'border-ink bg-ink text-bg',
                done && 'border-accent bg-accent text-bg',
                !active && !done && 'border-hairline text-ink-subtle',
              )}
            >
              {done ? '✓' : s.n}
            </span>
            <span className={cn('hidden sm:inline', active && 'text-ink')}>{s.label}</span>
            {s.n < STEPS.length && <span className="hidden sm:inline text-ink-subtle/40">—</span>}
          </li>
        );
      })}
    </ol>
  );
}
