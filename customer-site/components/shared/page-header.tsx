interface Props {
  eyebrow?: string;
  title: string;
  /** Optional highlighted phrase appended to the title in the primary color. */
  accent?: string;
  description?: string;
  sub?: string;
  action?: React.ReactNode;
  size?: 'display' | 'default' | 'subtle';
}

const TITLE_CLASS: Record<NonNullable<Props['size']>, string> = {
  display: 'display text-5xl sm:text-7xl lg:text-8xl',
  default: 'display text-3xl sm:text-5xl',
  subtle: 'text-2xl font-medium tracking-tight',
};

export function PageHeader({ eyebrow, title, accent, description, sub, action, size = 'display' }: Props) {
  const desc = description ?? sub;
  return (
    <div className="page pt-32 sm:pt-40 pb-12 border-b border-border">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-4xl">
          {eyebrow && (
            <div className="text-[10px] uppercase tracking-[0.18em] text-primary mb-5 font-mono font-medium">{eyebrow}</div>
          )}
          <h1 className={TITLE_CLASS[size]}>
            {title}
            {accent && <span className="text-primary"> {accent}</span>}
          </h1>
          {desc && (
            <p className="mt-6 text-base sm:text-lg text-foreground/60 leading-relaxed max-w-2xl">{desc}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
