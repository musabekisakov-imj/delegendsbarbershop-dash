// Stats marquee — band of rotating stats under the avatar stack.
// Mirrors the source pattern's StatsMarquee but uses real numbers
// pulled from the public API.

import { Marquee } from '@/components/ui/marquee';

interface Stat {
  emoji?: string;
  value: string;
  label: string;
}

interface Props {
  stats: Stat[];
  className?: string;
}

export function StatsMarquee({ stats, className }: Props) {
  return (
    <Marquee
      className={[
        'border-y border-border bg-black/30 backdrop-blur-sm py-2 [--duration:40s] [--gap:2.5rem]',
        className ?? '',
      ].join(' ')}
      pauseOnHover
      repeat={4}
    >
      {stats.map((stat) => (
        <div className="flex items-center gap-3 whitespace-nowrap" key={stat.label}>
          <span className="font-mono text-primary text-sm tracking-wide tabular font-bold">
            {stat.value}
          </span>
          <span className="font-mono text-sm text-foreground/70 uppercase tracking-[0.15em] font-medium">
            {stat.label}
          </span>
          {stat.emoji && <span className="text-base">{stat.emoji}</span>}
        </div>
      ))}
    </Marquee>
  );
}

/** Default stat set when none is provided — derived from the seed. */
export function defaultStats({
  staffCount,
  servicesCount,
  officesCount,
}: {
  staffCount: number;
  servicesCount: number;
  officesCount: number;
}): Stat[] {
  return [
    { value: String(officesCount).padStart(2, '0'), label: 'Salonas · Pilies g. 38, Senamiestis' },
    { value: String(staffCount).padStart(2, '0'), label: 'Meistrai · 5+ metų patirties' },
    { value: String(servicesCount).padStart(2, '0'), label: 'Paslaugos · su PVM' },
    { value: '6/7', label: 'Dienų · pirm—šeš' },
    { value: 'EST. 2022', label: 'Vilnius · Senamiestis' },
    { value: '60 SEK.', label: 'Rezervacija online' },
  ];
}
