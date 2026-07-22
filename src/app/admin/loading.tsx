import { Loader2 } from "lucide-react";

/**
 * Route-segment loader for every `/admin/*` navigation. The admin pages are
 * dynamic (service-role reads), so a click has a visible server round-trip —
 * this Suspense boundary renders INSTANTLY in the content area (the shell +
 * sidebar stay mounted) and is swapped out when the page streams in.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <span className="relative flex size-14 items-center justify-center rounded-2xl bg-neem/10">
        <Loader2 className="size-7 animate-spin text-neem-deep" aria-hidden />
      </span>
      <div className="text-center">
        <p className="font-display text-sm font-bold tracking-wide text-ink">
          Loading
        </p>
        <p className="mt-0.5 text-xs text-ink-soft">Fetching the latest data…</p>
      </div>
      {/* skeleton shimmer bars — hint at content without promising a layout */}
      <div className="mt-2 w-full max-w-md space-y-2" aria-hidden>
        <div className="h-3 animate-pulse rounded-full bg-cream-200" />
        <div className="h-3 w-4/5 animate-pulse rounded-full bg-cream-200" />
        <div className="h-3 w-3/5 animate-pulse rounded-full bg-cream-200" />
      </div>
      <span className="sr-only" role="status">
        Loading admin page
      </span>
    </div>
  );
}
