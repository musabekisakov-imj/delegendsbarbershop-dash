'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/cn';
import { Photo } from '@/components/shared/photo';
import { PHOTOS, GRADIENTS } from '@/lib/photos';
import { serviceGradientFor } from '@/lib/tokens';
import { slugify } from '@/lib/slug';
import { useT, useLang } from '@/lib/use-t';
import {
  translateServiceName,
  translateServiceDescription,
  translateCategory,
} from '@/lib/translate-service';
import type { Service, Office } from '@/lib/types';

const EASE = [0.16, 1, 0.3, 1] as const;

// Gradient ring keyed by service id — used as the photo's underlying fallback.
const FALLBACKS = [GRADIENTS.warm, GRADIENTS.cool, GRADIENTS.amber, GRADIENTS.earth] as const;
function fallbackFor(id: string): string {
  // Cheap, deterministic spread across the four warm gradients.
  const n = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return FALLBACKS[n % FALLBACKS.length];
}

// ─── Office filter pills ────────────────────────────────────────

export function OfficeFilter({
  offices,
  active,
  filterLabel,
  allLabel,
}: {
  offices: Office[];
  active?: string;
  filterLabel?: string;
  allLabel?: string;
}) {
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
      <span className="eyebrow mr-2">{filterLabel ?? 'Filter'}</span>
      <button
        type="button"
        onClick={() => setOffice(undefined)}
        className={cn('chip', !active && 'chip-active')}
      >
        {allLabel ?? 'All'}
      </button>
      {offices.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setOffice(o.id)}
          className={cn('chip', active === o.id && 'chip-active')}
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
  const t = useT();
  const filtered = officeFilter ? services.filter((s) => s.officeId === officeFilter) : services;

  if (filtered.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-muted-foreground text-sm">{t.booking.no_slots}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
    >
      {filtered.map((s) => (
        <ServiceCard key={s.id} service={s} />
      ))}
    </motion.div>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const t = useT();
  const { lang } = useLang();
  const photoUrl = PHOTOS.serviceByName[service.name];
  const fallback = fallbackFor(service.id);
  const gradientClass = serviceGradientFor(service.id);

  const name = translateServiceName(service.name, lang);
  const desc = service.description
    ? translateServiceDescription(service.description, lang)
    : undefined;
  const cat = service.category?.name
    ? translateCategory(service.category.name, lang)
    : t.nav.services;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
      }}
    >
      <Link
        href={`/services/${slugify(service.name)}`}
        className="card card-hover flex flex-col h-full group overflow-hidden"
      >
        {/* Photo header — falls through to gradient if URL is missing/broken */}
        <div className="relative aspect-[16/10]">
          {photoUrl ? (
            <Photo
              src={photoUrl}
              fallback={fallback}
              alt={name}
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className={cn('absolute inset-0 bg-gradient-to-br', gradientClass)} />
          )}
          {/* Bottom gradient veil so the duration chip stays readable */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
          <span className="absolute bottom-3 right-3 z-10 tabular text-[10px] uppercase tracking-eyebrow text-foreground/85 bg-background/55 backdrop-blur-sm px-2 py-1 rounded">
            {service.duration} {t.ui.duration_min}
          </span>
        </div>

        {/* Body */}
        <div className="p-7 sm:p-8 flex flex-col flex-1">
          <span className="eyebrow mb-3">{cat}</span>

          <h3 className="font-bold tracking-tight text-2xl sm:text-3xl mb-3 group-hover:text-primary transition-colors">
            {name}
          </h3>

          {desc && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">{desc}</p>
          )}

          {/* Price + arrow */}
          <div className="mt-auto flex items-baseline justify-between pt-4 border-t border-border">
            <span className="font-bold tracking-tight text-3xl sm:text-4xl tabular text-foreground">
              €{service.price}
            </span>
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-eyebrow text-muted-foreground group-hover:text-foreground transition-colors">
              {t.ui.select_arrow}
              <ArrowUpRightIcon className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform duration-300" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
