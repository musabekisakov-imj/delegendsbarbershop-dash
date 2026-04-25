'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { PublicStaff } from '@/lib/types';
import { GRADIENTS } from '@/lib/photos';

const EASE = [0.16, 1, 0.3, 1] as const;

// Per-staff fallback gradients — different colors so the grid doesn't repeat.
const FALLBACKS = [GRADIENTS.warm, GRADIENTS.amber, GRADIENTS.earth, GRADIENTS.cool];

export function TeamGrid({ staff }: { staff: PublicStaff[] }) {
  if (staff.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-ink-muted text-sm">Komandos sąrašas šiuo metu nepasiekiamas.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {staff.map((s, i) => (
        <StaffCard key={s.id} staff={s} index={i} fallback={FALLBACKS[i % FALLBACKS.length]} />
      ))}
    </motion.div>
  );
}

function StaffCard({
  staff,
  index,
  fallback,
}: {
  staff: PublicStaff;
  index: number;
  fallback: string;
}) {
  const initials = `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }}
    >
      <Link href="/book" className="card card-hover overflow-hidden flex flex-col group h-full">
        {/* Portrait area — uses gradient fallback (we don't generate facial photos) */}
        <div
          className="aspect-[4/5] flex items-center justify-center relative overflow-hidden"
          style={{
            background: staff.avatarUrl ? `url(${staff.avatarUrl}) center/cover` : fallback,
          }}
        >
          {!staff.avatarUrl && (
            <span className="display text-7xl text-ink-inverse/40 tabular">{initials}</span>
          )}
          <div className="absolute top-4 left-4 text-[10px] uppercase tracking-eyebrow text-ink-inverse/60 tabular">
            № {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="display text-2xl tracking-tight group-hover:text-oxblood transition-colors">
            {staff.firstName}
          </div>
          <div className="eyebrow mt-1 mb-auto">{staff.lastName}</div>

          <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-xs text-ink-muted">
            <span className="tabular">5+ metų patirtis</span>
            <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 group-hover:text-ink transition-all duration-300" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
