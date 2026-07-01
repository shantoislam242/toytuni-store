"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Slim progress bar that fills from 0 to `value`% the first time it scrolls into
 * view. Respects prefers-reduced-motion (renders at the final width, no anim).
 */
export function LoyaltyProgress({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-cream-200"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full bg-neem"
        initial={reduce ? false : { width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
  );
}
