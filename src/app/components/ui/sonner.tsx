"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group-[.toaster]:rounded-2xl group-[.toaster]:border group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:shadow-[0_18px_42px_-28px_rgba(15,23,42,0.85)] group-[.toaster]:backdrop-blur",
          title: "group-[.toaster]:text-sm group-[.toaster]:font-bold",
          description: "group-[.toaster]:text-xs group-[.toaster]:font-medium",
          success:
            "group-[.toaster]:border-emerald-200 group-[.toaster]:bg-emerald-50 group-[.toaster]:text-emerald-950 dark:group-[.toaster]:border-emerald-500/25 dark:group-[.toaster]:bg-emerald-500/12 dark:group-[.toaster]:text-emerald-100",
          error:
            "group-[.toaster]:border-red-200 group-[.toaster]:bg-red-50 group-[.toaster]:text-red-950 dark:group-[.toaster]:border-red-500/30 dark:group-[.toaster]:bg-red-500/12 dark:group-[.toaster]:text-red-100",
          warning:
            "group-[.toaster]:border-amber-200 group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-950 dark:group-[.toaster]:border-amber-400/30 dark:group-[.toaster]:bg-amber-400/12 dark:group-[.toaster]:text-amber-100",
          info:
            "group-[.toaster]:border-sky-200 group-[.toaster]:bg-sky-50 group-[.toaster]:text-sky-950 dark:group-[.toaster]:border-sky-400/30 dark:group-[.toaster]:bg-sky-400/12 dark:group-[.toaster]:text-sky-100",
          closeButton:
            "group-[.toaster]:border-current group-[.toaster]:bg-transparent group-[.toaster]:text-current group-[.toaster]:opacity-55 group-[.toaster]:transition-opacity hover:group-[.toaster]:opacity-100",
          actionButton:
            "group-[.toaster]:rounded-lg group-[.toaster]:bg-primary group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-xs group-[.toaster]:font-bold group-[.toaster]:text-primary-foreground",
          cancelButton:
            "group-[.toaster]:rounded-lg group-[.toaster]:bg-muted group-[.toaster]:px-3 group-[.toaster]:py-1.5 group-[.toaster]:text-xs group-[.toaster]:font-bold group-[.toaster]:text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
