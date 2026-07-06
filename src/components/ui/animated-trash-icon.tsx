"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Trash icon with a premium micro-interaction. Matches lucide's line style, but
 * splits the glyph into a lid (rim + handle), the can, and a droppable "item":
 *
 *  - Hover the enclosing `.trash-host` button (or the icon itself) → the lid
 *    tilts open a touch.
 *  - When `playKey` changes → an item drops into the can and the lid swings
 *    shut (a one-shot ~0.6s animation).
 *
 * Purely decorative — it never touches the parent's click handler, so the
 * delete flow is unaffected. Hover/drop styling + reduced-motion handling live
 * in globals.css (`.trash-lid` / `.trash-item` / `.is-dropping`).
 */
export function AnimatedTrashIcon({
  className,
  playKey = 0,
}: {
  className?: string;
  /** Change this value (e.g. increment on click) to play the drop animation. */
  playKey?: number;
}) {
  const [dropping, setDropping] = useState(false);
  const isFirst = useRef(true);
  const timer = useRef<number | null>(null);

  // Play the drop whenever playKey changes — but not on the initial mount.
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    setDropping(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDropping(false), 620);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playKey]);

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("trash-icon", dropping && "is-dropping", className)}
    >
      {/* can body + inner slots (static) */}
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      {/* item that drops into the can on a delete */}
      <path className="trash-item" d="M9 9h6" />
      {/* lid: rim + handle (tilts open on hover / during the drop) */}
      <g className="trash-lid">
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </g>
    </svg>
  );
}
