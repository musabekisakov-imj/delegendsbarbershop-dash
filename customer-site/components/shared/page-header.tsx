// Dashboard-style page header — eyebrow + title + optional description + action.
// Mirrors src/app/components/shared/page-header.tsx in the dashboard.

interface Props {
  eyebrow?: string;
  title: string;
  /** Optional highlighted phrase appended to the title in the primary color. */
  accent?: string;
  description?: string;
  /** Alias for description — kept for compatibility with older call sites. */
  sub?: string;
  action?: React.ReactNode;
  size?: 'display' | 'default' | 'subtle';
}

const TITLE_CLASS: Record<NonNullable<Props['size']>, string> = {
  display: 'text-3xl sm:text-4xl font-bold tracking-tight text-foreground',
  default: 'text-2xl font-bold tracking-tight text-foreground',
  subtle: 'text-lg font-semibold text-foreground',
};

export function PageHeader({ eyebrow, title, accent, description, sub, action, size = 'display' }: Props) {
  const desc = description ?? sub;
  return (
    <div className="page pt-10 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <div className="eyebrow mb-2">{eyebrow}</div>
          )}
          <h1 className={TITLE_CLASS[size]}>
            {title}
            {accent && <span className="text-primary"> {accent}</span>}
          </h1>
          {desc && (
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{desc}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
    </div>
  );
}
