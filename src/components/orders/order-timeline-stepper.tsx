import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrackStep } from "@/lib/orders/tracking-steps";

/**
 * Presentational order-tracking stepper — renders `buildTrackingSteps()`'s
 * output as a vertical list on mobile and a horizontal row from `sm:` up.
 * Each step is a node (done = filled circle + check, active = ringed,
 * todo = muted dot) plus a label, connected by a line; the `cancelled` step
 * (only present when the order was cancelled — see `buildTrackingSteps`)
 * gets a distinct red treatment. Server component: no client state,
 * cream/ink palette matching the rest of `/account`.
 */
export function OrderTimelineStepper({ steps }: { steps: TrackStep[] }) {
  return (
    <ol className="flex flex-col sm:flex-row">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const isCancelled = step.key === "cancelled";
        return (
          <li
            key={step.key}
            className={cn(
              "relative flex flex-1 items-start gap-3 pb-8 sm:flex-col sm:items-center sm:gap-0 sm:pb-0 sm:text-center",
              isLast && "pb-0",
            )}
          >
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3 left-3 z-0 h-full w-px sm:top-3 sm:left-1/2 sm:h-px sm:w-full",
                  step.state === "done" ? "bg-neem" : "bg-cream-300",
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                isCancelled
                  ? "border-danger bg-danger text-white"
                  : step.state === "done"
                    ? "border-neem bg-neem text-white"
                    : step.state === "active"
                      ? "border-neem bg-cream-50 text-neem"
                      : "border-cream-300 bg-cream-50 text-ink-soft",
              )}
            >
              {isCancelled ? (
                <X className="size-3.5" strokeWidth={3} />
              ) : step.state === "done" ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    step.state === "active" ? "bg-neem" : "bg-cream-300",
                  )}
                />
              )}
            </span>
            <span
              className={cn(
                "text-sm font-medium sm:mt-2",
                isCancelled ? "text-danger" : step.state === "todo" ? "text-ink-soft" : "text-ink",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
