import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default:
          "border-border bg-card text-card-foreground",
        destructive:
          "border-red-200 bg-red-50 text-red-950 [&>svg]:text-red-600 *:data-[slot=alert-description]:text-red-800 dark:border-red-500/30 dark:bg-red-500/12 dark:text-red-100 dark:[&>svg]:text-red-300 dark:*:data-[slot=alert-description]:text-red-100/80",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-950 [&>svg]:text-emerald-600 *:data-[slot=alert-description]:text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/12 dark:text-emerald-100 dark:[&>svg]:text-emerald-300 dark:*:data-[slot=alert-description]:text-emerald-100/80",
        warning:
          "border-amber-200 bg-amber-50 text-amber-950 [&>svg]:text-amber-600 *:data-[slot=alert-description]:text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/12 dark:text-amber-100 dark:[&>svg]:text-amber-300 dark:*:data-[slot=alert-description]:text-amber-100/80",
        info:
          "border-sky-200 bg-sky-50 text-sky-950 [&>svg]:text-sky-600 *:data-[slot=alert-description]:text-sky-800 dark:border-sky-400/30 dark:bg-sky-400/12 dark:text-sky-100 dark:[&>svg]:text-sky-300 dark:*:data-[slot=alert-description]:text-sky-100/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
