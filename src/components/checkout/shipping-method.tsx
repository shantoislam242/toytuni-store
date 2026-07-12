import { Check, Lock, Truck } from "lucide-react";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";
import { shippingOptions } from "@/lib/mock/checkout";
import { getShippingFee, zoneForDistrict } from "@/lib/shipping";

/**
 * Shipping-method picker - selectable radio cards. Controlled via `value` /
 * `onChange`; UI only (nothing is persisted). Free shipping unlocks by subtotal,
 * and express delivery is available only for Dhaka addresses.
 */
export function ShippingMethod({
  value,
  onChange,
  subtotal,
  freeShippingThreshold,
  district,
}: {
  value: string;
  onChange: (id: string) => void;
  subtotal: number;
  freeShippingThreshold: number;
  district?: string | null;
}) {
  const zone = district ? zoneForDistrict(district) : null;
  const expressAvailable = zone?.id === "inside_dhaka";

  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
        <Truck className="size-5 text-neem-deep" />
        Shipping Method
      </h2>

      <div className="mt-4 grid gap-3">
        {shippingOptions.map((option) => {
          const selected = value === option.id;
          const freeLocked = option.id === "free" && subtotal < freeShippingThreshold;
          const expressLocked = option.id === "express" && !expressAvailable;
          const locked = freeLocked || expressLocked;
          const remaining = freeShippingThreshold - subtotal;
          const price =
            option.id === "standard" && district ? getShippingFee(district) : option.price;
          const description = freeLocked
            ? `Add ${formatTk(remaining)} more to unlock`
            : expressLocked
              ? "Available inside Dhaka only"
              : `${option.desc} - ${option.eta}`;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => !locked && onChange(option.id)}
              disabled={locked}
              aria-pressed={selected}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                locked
                  ? "cursor-not-allowed border-cream-300 opacity-60"
                  : selected
                    ? "border-neem bg-neem/5 ring-1 ring-neem"
                    : "border-cream-300 hover:border-neem-soft",
              )}
            >
              <span
                className={cn(
                  "flex size-5 flex-none items-center justify-center rounded-full border transition-colors",
                  locked
                    ? "border-cream-300 text-ink-soft"
                    : selected
                      ? "border-neem bg-neem text-paper"
                      : "border-cream-300",
                )}
              >
                {locked ? (
                  <Lock className="size-3" />
                ) : selected ? (
                  <Check className="size-3" strokeWidth={3} />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{option.label}</p>
                <p className="text-xs text-ink-soft">{description}</p>
              </div>
              <span className="text-sm font-bold text-ink">
                {price === 0 ? "Free" : formatTk(price)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
