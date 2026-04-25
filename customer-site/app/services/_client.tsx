'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/cn';
import type { Service, Office } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

// ─── Office filter pills ────────────────────────────────────────

export function OfficeFilter({ offices, active }: { offices: Office[]; active?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setOffice(officeId?: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (officeId) params.set('office', officeId);
    else params.delete('office');
    router.push(`/services${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow mr-2">Filtras</span>
      <button
        type="button"
        onClick={() => setOffice(undefined)}
        className={cn('pill', !active && 'pill-active')}
      >
        Visi salonai
      </button>
      {offices.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setOffice(o.id)}
          className={cn('pill', active === o.id && 'pill-active')}
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

// ─── Services grid (responsive cards) ───────────────────────────

export function ServicesGrid({
  services,
  officeFilter,
}: {
  services: Service[];
  officeFilter?: string;
}) {
  const filtered = officeFilter ? services.filter((s) => s.officeId === officeFilter) : services;

  if (filtered.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-ink-muted text-sm">
          Šiame salone paslaugų sąrašas tuščias. Pabandykite kitą.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      {filtered.map((s) => (
        <ServiceCard key={s.id} service={s} />
      ))}
    </motion.div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      <Link href="/book" className="card card-hover p-7 sm:p-8 flex flex-col h-full group">
        {/* Eyebrow */}
        <div className="flex items-center justify-between mb-6">
          <span className="eyebrow">{service.category?.name ?? 'Paslauga'}</span>
          <span className="tabular text-[10px] uppercase tracking-eyebrow text-ink-subtle">
            {service.duration} min
          </span>
        </div>

        {/* Title */}
        <h3 className="display text-3xl sm:text-4xl tracking-snug mb-3 group-hover:text-moss transition-colors">
          {service.name}
        </h3>

        {service.description && (
          <p className="text-sm text-ink-muted leading-relaxed mb-8">{service.description}</p>
        )}

        {/* Price + arrow */}
        <div className="mt-auto flex items-baseline justify-between pt-4 border-t border-hairline">
          <span className="display text-4xl tabular text-ink">€{service.price}</span>
          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow text-ink-muted group-hover:text-ink transition-colors">
            Užsisakyti
            <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
