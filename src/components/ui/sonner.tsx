"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { CheckCircle2 } from "lucide-react";

/**
 * Brand-styled toast host. Sonner supplies the smooth slide/fade-in and
 * swipe-to-dismiss animations; we theme the surface with our cream/ink/neem
 * tokens and use a neem success icon so it matches the storefront.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-center"
      duration={2600}
      offset={20}
      mobileOffset={{ bottom: "84px" }}
      icons={{
        success: <CheckCircle2 className="size-[18px] text-neem-deep" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-xl border-cream-300 bg-card text-ink shadow-lg",
          title: "font-display text-sm font-semibold text-ink",
          description: "text-xs text-ink-muted",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--cream-300)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
