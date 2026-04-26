'use client';

// Minimal EU/Lithuanian-compliant cookie banner.
// Persists consent in localStorage so it stays dismissed across visits.
// Slide-up entrance via Framer Motion. Brutalist edges to match HALL.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const STORAGE_KEY = 'barberpro_cookie_consent';

export function CookieBanner() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Only show if no choice has been recorded yet. Defer to next paint
    // so SSR and first hydration match (banner appears after JS boots).
    const timer = setTimeout(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setShown(true);
      } catch {
        // Local storage unavailable (private mode etc.) — show banner anyway.
        setShown(true);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  function dismiss(value: 'accepted' | 'rejected') {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignored — user dismissed regardless
    }
    setShown(false);
  }

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          role="dialog"
          aria-label="Slapukų sutikimas"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:max-w-md z-50"
        >
          <div className="bg-surface-2 border border-border-strong p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
            <div className="flex items-start justify-between gap-4 mb-3">
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary font-mono font-medium">
                Slapukai
              </span>
              <button
                onClick={() => dismiss('rejected')}
                aria-label="Uždaryti pranešimą"
                className="text-foreground/40 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-5">
              Naudojame techninius slapukus svetainės veikimui. Jokių
              reklaminių ar sekimo slapukų. Daugiau —{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                privatumo politika
              </Link>
              .
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => dismiss('accepted')}
                className="inline-flex items-center bg-primary text-primary-foreground pl-4 py-0 pr-0 text-xs font-medium hover:bg-foreground hover:text-background transition-colors"
              >
                <span>Sutinku</span>
                <span className="border-l border-black/30 px-3 py-2.5 ml-4">OK</span>
              </button>
              <button
                onClick={() => dismiss('rejected')}
                className="px-4 py-2 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors"
              >
                Tik būtini
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
