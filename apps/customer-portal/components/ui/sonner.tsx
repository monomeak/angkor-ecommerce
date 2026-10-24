"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

import { useAppTheme } from "@/components/providers/theme-provider";

/** shadcn's wrapper, themed off this portal's own context rather than next-themes. */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useAppTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-600 dark:text-emerald-400" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Fixed width, but never wider than the screen minus a gutter.
          "--width": "min(380px, calc(100vw - 2rem))",
          // Sonner sets its own system font stack; inline style beats its attribute selector.
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
