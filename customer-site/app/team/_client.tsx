'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import type { PublicStaff } from '@/lib/types';
import { GRADIENTS, PHOTOS } from '@/lib/photos';
import { useT } from '@/lib/use-t';

const EASE = [0.16, 1, 0.3, 1] as const;

// Per-staff fallback gradients — different colors so the grid doesn't repeat.
const FALLBACKS = [GRADIENTS.warm, GRADIENTS.amber, GRADIENTS.earth, GRADIENTS.cool];

export function TeamGrid({ staff }: { staff: PublicStaff[] }) {
  const t = useT();
  if (staff.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground text-sm">{t.confirm.empty_title}</p>
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
  const t = useT();
  const initials = `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();
  const portrait = staff.avatarUrl ?? PHOTOS.staffByFirstName[staff.firstName] ?? null;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
      }}
    >
      <Link href="/book" className="card card-hover overflow-hidden flex flex-col group h-full">
        {/* Portrait area — real photo when available, gradient + initials fallback */}
        <div
          className="aspect-[4/5] flex items-center justify-center relative overflow-hidden"
          style={{
            background: portrait ? `url("${portrait}") center/cover` : fallback,
          }}
        >
          {!portrait && (
            <span className="font-bold tracking-tight text-7xl text-foreground/35 tabular">{initials}</span>
          )}
          {/* Subtle bottom veil so name + chip read on bright photos */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background/85 to-transparent pointer-events-none" />
          <div className="absolute top-4 left-4 text-[10px] uppercase tracking-eyebrow text-white/85 bg-black/35 backdrop-blur-sm px-2 py-1 rounded tabular">
            № {String(index + 1).padStart(2, '0')}
          </div>
        </div>

        <div className="p-6 flex flex-col flex-1">
          <div className="font-bold tracking-tight text-2xl tracking-tight group-hover:text-primary transition-colors">
            {staff.firstName}
          </div>
          <div className="eyebrow mt-1 mb-auto">{staff.lastName}</div>

          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular">{t.team_preview.experience}</span>
            <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 group-hover:text-foreground transition-all duration-300" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
