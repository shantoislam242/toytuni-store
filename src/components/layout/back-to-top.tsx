"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * Global "Back to Top" button. Appears (fade + slide-up) once the footer scrolls
 * into view and smooth-scrolls to the top on click, then fades out when the
 * footer leaves the viewport. Horizontally centred near the bottom, kept clear
 * of the mobile bottom navigation. Respects prefers-reduced-motion. Rendered
 * once in the root layout → present site-wide.
 *
 * Centring uses `inset-x-0 mx-auto` (not a transform) because Framer Motion
 * writes the element's `transform` inline for the slide/scale animations — a
 * Tailwind `-translate-x-1/2` would be overwritten and break the centring.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();

  // Show the button while the site footer is intersecting the viewport. Re-runs
  // on route change because the footer node is remounted per route (and is
  // absent on bare routes, where the button then simply never appears).
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) {
      setVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);

  const scrollToTop = () =>
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          whileHover={reduceMotion ? undefined : { scale: 1.08 }}
          whileTap={reduceMotion ? undefined : { scale: 0.92 }}
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex size-11 items-center justify-center rounded-full bg-neem text-paper shadow-lg transition-[background-color,box-shadow] duration-200 hover:bg-neem-deep hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neem sm:size-12 md:bottom-8"
        >
          <ArrowUp className="size-5 sm:size-6" strokeWidth={2.5} />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
