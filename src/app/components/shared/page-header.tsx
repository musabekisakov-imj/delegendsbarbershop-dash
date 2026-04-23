interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /**
   * Size by criticality — not every page needs the biggest title.
   * Refactoring UI: hierarchy should come from weight + purpose, not just size.
   *  - "display" → primary workspaces (Bookings, Calendar, Overview)
   *  - "default" → day-to-day pages (Clients, Staff, Services)
   *  - "subtle"  → utility pages (Settings, Help, Team & access)
   */
  size?: 'display' | 'default' | 'subtle';
}

const TITLE_CLASS: Record<NonNullable<PageHeaderProps['size']>, string> = {
  display: 'text-2xl font-bold tracking-tight text-foreground',
  default: 'text-xl font-bold tracking-tight text-foreground',
  subtle:  'text-lg font-semibold text-foreground',
};

export function PageHeader({ title, description, action, size = 'default' }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className={TITLE_CLASS[size]}>{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
