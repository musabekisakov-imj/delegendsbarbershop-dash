// "Šiandien laisva: 14:30 · 16:15 · 17:00" — infinite scrolling marquee.
// Fed by real availability from the backend so the home page tells the truth
// about what's free RIGHT NOW. The signature detail of the HOURS direction.

interface Props {
  slots: string[];
  label?: string;
}

export function NowMarquee({ slots, label = 'Šiandien laisva' }: Props) {
  // If backend is down or no slots, render a neutral fallback that still feels intentional.
  const display = slots.length > 0 ? slots : ['Susitarkite vizitą iš anksto'];
  // Duplicate the list so the CSS marquee loops seamlessly.
  const doubled = [...display, ...display];

  return (
    <div className="border-y border-hairline bg-ink-2/40 overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 px-6 py-4 border-r border-hairline">
          <span className="eyebrow tabular">{label} · {new Date().toLocaleDateString('lt-LT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="flex animate-marquee whitespace-nowrap py-4 will-change-transform">
            {doubled.map((slot, i) => (
              <span key={i} className="flex items-center gap-8 px-8 text-bone tabular text-base">
                {slots.length > 0 ? (
                  <>
                    <span>{slot}</span>
                    <span className="text-bone-subtle">·</span>
                  </>
                ) : (
                  <span className="text-bone-muted">{slot}</span>
                )}
              </span>
            ))}
          </div>
          {/* Edge fade — masks the loop seam */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-ink-2 to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-ink-2 to-transparent" />
        </div>
      </div>
    </div>
  );
}
