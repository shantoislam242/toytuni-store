import { Gift } from "lucide-react";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";

// Each denomination gets its own premium gradient — like tiered gift-card
// "metals" — so different amounts are instantly distinguishable. Keyed by
// amount with an emerald fallback for any value outside the presets.
const cardGradient: Record<number, string> = {
  // Emerald (house green)
  500: "bg-[linear-gradient(140deg,var(--neem-deep),var(--neem)_55%,var(--neem-soft))]",
  // Bronze / terracotta
  1000: "bg-[linear-gradient(140deg,#6b3b23,#c8622f_55%,#e0a24e)]",
  // Sapphire
  2000: "bg-[linear-gradient(140deg,#1e3a5f,#2f6db0_55%,#7fb0d8)]",
  // Amethyst / plum
  3000: "bg-[linear-gradient(140deg,#3d2452,#7b4aa0_55%,#c79bd6)]",
};

const FALLBACK_GRADIENT =
  "bg-[linear-gradient(140deg,var(--neem-deep),var(--neem)_55%,var(--neem-soft))]";

/** The gradient utility class for a denomination (emerald fallback). */
export function giftCardGradientClass(amount: number) {
  return cardGradient[amount] ?? FALLBACK_GRADIENT;
}

/**
 * A self-contained, premium gift-card visual used wherever a gift-card line has
 * no product photo (e.g. the cart). Pure CSS: a tiered gradient "card" with a
 * soft sheen, decorative corner discs, a gift glyph, a small wordmark and the
 * denomination — so it reads as an intentional design instead of a missing image.
 * The gradient varies per denomination (see `cardGradient`).
 */
export function GiftCardThumb({
  amount,
  className,
}: {
  amount: number;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`Gift Card — ${formatTk(amount)}`}
      className={cn(
        "relative flex size-full select-none flex-col justify-between overflow-hidden rounded-lg p-2.5 text-paper shadow-inner sm:p-3",
        cardGradient[amount] ?? FALLBACK_GRADIENT,
        className,
      )}
    >
      {/* decorative sheen + discs */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-5 -top-6 size-16 rounded-full bg-paper/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-7 -left-4 size-14 rounded-full bg-ink/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-paper/20 to-transparent"
      />

      <div className="relative flex items-center justify-between">
        <Gift className="size-4 drop-shadow-sm sm:size-5" />
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-paper/85 sm:text-[9px]">
          Gift
        </span>
      </div>

      <div className="relative">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-paper/80">
          Gift Card
        </p>
        <p className="font-display text-base font-bold leading-none drop-shadow-sm sm:text-lg">
          {formatTk(amount)}
        </p>
      </div>
    </div>
  );
}
