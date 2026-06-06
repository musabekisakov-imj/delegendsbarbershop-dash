import { cn } from '../ui/utils';

interface PageHeaderProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  action,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1 className={cn(
          'mt-2 text-3xl font-bold leading-none tracking-tight text-foreground sm:text-4xl',
          titleClassName,
        )}>
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeaderDivider() {
  return <span className="text-muted-foreground/40">·</span>;
}
