"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Info, Sparkles } from "lucide-react";

/**
 * "Expert Insight" affordance next to the age badge on the product page. A
 * subtle info (ⓘ) icon that reveals a popover explaining why the toy suits the
 * selected age and what developmental benefits it offers.
 *
 * Interaction: opens on hover for fine pointers (desktop) and on click/tap for
 * coarse pointers (mobile). Closes on Escape, outside click, or when focus
 * leaves. Fully keyboard accessible (Tab to focus, Enter/Space to toggle) with a
 * fade + scale animation that respects `prefers-reduced-motion`.
 */
export function AgeInsight({
  ageLabel,
  focus,
  benefits,
  learnMoreHref,
}: {
  ageLabel: string;
  /** Developmental focus for the age tier, e.g. "Grasp, soothe & sense". */
  focus?: string;
  /** Developmental benefits of the toy. */
  benefits: string[];
  /** Destination for the "Learn More" button (the product's Expert Insights
   *  page). Passed in so the route lives in one place and can change without
   *  touching this component. */
  learnMoreHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [hoverable, setHoverable] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const reduceMotion = useReducedMotion();

  // Detect hover capability so touch devices toggle on tap instead.
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverable(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setHoverable(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const hoverOpen = () => {
    if (!hoverable) return;
    cancelClose();
    setOpen(true);
  };
  // A short delay bridges the gap between the icon and the panel.
  const hoverClose = () => {
    if (!hoverable) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 120);
  };

  // Escape + outside-click close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const reason = focus
    ? `At this stage little ones are working on ${focus
        .toLowerCase()
        .replace(/\s*&\s*/g, ", ")} — this toy is designed and sized to match.`
    : "This toy is designed and sized for what children are learning at this stage.";

  return (
    <div
      ref={wrapRef}
      className="relative inline-flex"
      onMouseEnter={hoverOpen}
      onMouseLeave={hoverClose}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Expert insight — why this toy suits ${ageLabel}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        className="inline-flex size-7 items-center justify-center rounded-full border border-cream-300 bg-cream-100 text-neem-deep transition-colors hover:bg-cream-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem"
      >
        <Info className="size-4" strokeWidth={2} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id={panelId}
            role="dialog"
            aria-label={`Expert insight for ${ageLabel}`}
            tabIndex={-1}
            onMouseEnter={hoverOpen}
            onMouseLeave={hoverClose}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "top left" }}
            className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-cream-200 bg-paper p-4 text-left shadow-xl shadow-ink/10"
          >
            {/* caret */}
            <span
              aria-hidden
              className="absolute -top-1.5 left-3 size-3 rotate-45 rounded-[3px] border-l border-t border-cream-200 bg-paper"
            />

            <div className="flex items-center gap-2">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-neem/10 text-neem-deep">
                <Sparkles className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-ink">Expert Insight</p>
                <p className="text-xs text-ink-soft">Recommended for {ageLabel}</p>
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{reason}</p>

            {benefits.length ? (
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neem-deep">
                  Developmental benefits
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-ink">
                      <span
                        aria-hidden
                        className="mt-1.5 size-1.5 flex-none rounded-full bg-neem"
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Link
              href={learnMoreHref}
              onClick={() => setOpen(false)}
              className="group/cta mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-neem px-4 text-sm font-semibold text-paper shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-neem-deep hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem"
            >
              Learn More
              <ArrowRight className="size-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
