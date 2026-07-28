"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget. Loads the Turnstile script once, renders the
 * widget, and reports the solved token via `onToken`. Renders nothing when
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset (env-gated), so signup falls back
 * to working without bot protection during local/unconfigured runs.
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

/** True when Turnstile is configured (site key present). */
export const turnstileEnabled = Boolean(SITE_KEY);

export function TurnstileWidget({
  onToken,
  onExpire,
}: {
  onToken: (token: string) => void;
  onExpire?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep the latest callbacks in refs so the mount effect runs exactly once
  // (passing fresh function identities each render must not re-render the
  // widget — that would reset the challenge).
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  // Sync the latest callbacks after each render (never during render).
  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;

    const render = () => {
      if (cancelled || widgetIdRef.current || !containerRef.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onExpireRef.current?.(),
        "error-callback": () => onExpireRef.current?.(),
        theme: "light",
      });
    };

    if (window.turnstile) {
      render();
    } else {
      if (!document.querySelector(`script[src^="${SCRIPT_SRC}"]`)) {
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
      poll = setInterval(() => {
        if (window.turnstile) {
          if (poll) clearInterval(poll);
          render();
        }
      }, 200);
    }

    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="flex min-h-[65px] justify-center" />;
}
