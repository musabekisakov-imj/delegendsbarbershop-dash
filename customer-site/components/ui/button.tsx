'use client';

// HALL Button — focused on the brutalist `mark` variant the hero pattern needs.
// Drops the dashboard's shadcn variants since the customer site uses
// `.btn-mark` / `.btn-ink` / `.btn-ghost` utility classes from globals.css.
// This wrapper exists to support the {asChild} pattern from the source pattern.

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        // Brutalist mark — lime fill, dark text, asymmetric padding
        mark: 'bg-primary text-primary-foreground pl-5 py-0 pr-0 text-sm hover:bg-foreground hover:text-background',
        // Inverse — bone fill on dark
        ink: 'bg-foreground text-background pl-5 py-0 pr-0 text-sm hover:bg-primary hover:text-primary-foreground',
        // Outlined
        ghost: 'bg-transparent text-foreground border border-[rgba(255,255,255,0.2)] pl-5 py-0 pr-0 text-sm hover:bg-foreground hover:text-background',
        // Plain text link with arrow rotation on hover (used inline in copy)
        link: 'inline-flex items-center gap-1.5 px-0 py-0 text-sm text-foreground hover:text-primary',
      },
      size: {
        default: '',
        lg: 'pl-7 text-base',
      },
    },
    defaultVariants: {
      variant: 'mark',
      size: 'default',
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };

/**
 * IconBox — the right-side bordered arrow box used in mark/ink/ghost buttons.
 * Place inside the Button: <Button variant="mark">Text<IconBox><ArrowRight /></IconBox></Button>
 */
export function IconBox({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('border-l border-[rgba(0,0,0,0.18)] p-3 ml-5 inline-flex items-center', className)}
      {...props}
    >
      {children}
    </span>
  );
}
