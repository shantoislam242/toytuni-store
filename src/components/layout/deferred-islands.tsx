"use client";

import dynamic from "next/dynamic";

/**
 * Non-critical, purely decorative/scroll-triggered client islands, code-split
 * and loaded AFTER hydration (never server-rendered). They render nothing until
 * the user interacts/scrolls, so deferring them keeps their JS off the initial
 * critical path and the main thread — with no visual or behavioural change:
 *   - CursorSparkleTrail: a desktop mouse-trail (no-op on touch devices anyway)
 *   - BackToTop: only appears once the footer scrolls into view
 */
const CursorSparkleTrail = dynamic(
  () =>
    import("@/components/home/cursor-sparkle-trail").then(
      (m) => m.CursorSparkleTrail,
    ),
  { ssr: false },
);

const BackToTop = dynamic(
  () => import("@/components/layout/back-to-top").then((m) => m.BackToTop),
  { ssr: false },
);

export function DeferredIslands() {
  return (
    <>
      <BackToTop />
      <CursorSparkleTrail />
    </>
  );
}
