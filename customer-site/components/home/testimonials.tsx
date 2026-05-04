import { getServerT } from '@/lib/i18n';

export function Testimonials() {
  const t = getServerT();
  return (
    <section className="page py-24 sm:py-32 border-t border-border">
      <div className="grid lg:grid-cols-12 gap-10 mb-16">
        <div className="lg:col-span-5">
          <div className="eyebrow mb-4">{t.testimonials.eyebrow}</div>
          <h2 className="font-medium tracking-tight text-3xl sm:text-5xl">
            {t.testimonials.title_a}{' '}
            <span className="text-primary">{t.testimonials.title_accent}</span>
          </h2>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {t.testimonials.items.map((item, i) => (
          <figure
            key={i}
            className="card p-8 sm:p-9 flex flex-col h-full"
          >
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-primary tabular mb-6">
              {String(i + 1).padStart(2, '0')} / {String(t.testimonials.items.length).padStart(2, '0')}
            </span>
            <blockquote className="text-lg sm:text-xl text-foreground/90 leading-relaxed italic flex-1">
              &laquo;{item.quote}&raquo;
            </blockquote>
            <figcaption className="mt-6 pt-6 border-t border-border">
              <div className="font-semibold text-base text-foreground">{item.name}</div>
              <div className="eyebrow mt-1">{item.meta}</div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
