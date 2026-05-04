// <Photo> — robust photographic surface with built-in gradient fallback.
//
// CSS background-image stacks: photo URL on top, gradient underneath. If the
// photo fails to load (404, network, blocked), the gradient stays visible —
// no broken image icons, ever. Filter unifies any photo into HOURS palette.

import { cn } from '@/lib/cn';

interface Props {
  src: string;
  fallback: string; // CSS gradient string from GRADIENTS
  alt?: string;     // for accessibility — rendered as a hidden <img>
  className?: string;
  /** Apply the site-wide unifying filter. Defaults to true. */
  treated?: boolean;
  children?: React.ReactNode;
}

export function Photo({
  src,
  fallback,
  alt = '',
  className,
  treated = true,
  children,
}: Props) {
  return (
    <div
      role={alt ? 'img' : 'presentation'}
      aria-label={alt || undefined}
      className={cn('relative overflow-hidden bg-background', className)}
      style={{
        backgroundImage: `url("${src}"), ${fallback}`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Theme-aware filter — light mode lifts brightness, dark crushes it
        ...(treated && { filter: 'var(--photo-filter)' }),
      }}
    >
      {children}
    </div>
  );
}
