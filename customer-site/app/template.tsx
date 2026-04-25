'use client';

// Next.js App Router runs `template.tsx` on every navigation (unlike layout
// which persists). That gives Framer a fresh mount to animate from — clean
// page-to-page transitions without managing AnimatePresence state manually.

import { motion } from 'framer-motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
