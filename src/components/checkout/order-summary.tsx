import { Lock, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ProductImage } from "@/components/product/product-image";
import { GiftCardThumb } from "@/components/cart/gift-card-thumb";
import { formatTk } from "@/lib/format";
import type { CartItem } from "@/lib/cart/cart-context";

/**
 * Reusable order-summary card: line items (thumbnail, name, qty, line total) and
 * the money breakdown (subtotal, delivery, optional discount, total) plus the
 * primary CTA. Presentational — all figures and the CTA are passed in.
 */
export function OrderSummary({
  items,
  subtotal,
  delivery,
  deliveryZoneLabel,
  discount,
  codFee,
  total,
  ctaLabel,
  onCta,
  advanceDueNow,
  coupon,
}: {
  items: CartItem[];
  subtotal: number;
  delivery: number;
  /** Zone name for the chosen address (e.g. "Inside Dhaka"), if any. */
  deliveryZoneLabel?: string | null;
  discount: number;
  /** Cash-on-delivery fee (BDT), if the chosen payment method is COD. */
  codFee?: number;
  total: number;
  ctaLabel: string;
  onCta: () => void;
  /** Pre-order advance total (BDT) due now, if any cart line is a pre-order. */
  advanceDueNow?: number;
  /** Coupon apply/remove controls. Omit to hide the coupon field entirely. */
  coupon?: {
    applied: string | null;
    input: string;
    onInput: (v: string) => void;
    onApply: () => void;
    onRemove: () => void;
    busy: boolean;
    /** Hint shown under an applied coupon that isn't currently discounting
     *  (e.g. cart fell below its minimum). */
    note?: string | null;
  };
}) {
  return (
    <div className="rounded-2xl border border-cream-300 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">Order Summary</h2>

      {/* line items */}
      <ul className="mt-4 space-y-4">
        {items.map(({ product, qty, lineTotal }) => (
          <li key={product.slug} className="flex items-center gap-3">
            <div className="size-14 flex-none overflow-hidden rounded-xl border border-cream-300 bg-frame">
              {product.slug.startsWith("gift-card-") ? (
                <GiftCardThumb amount={product.price} className="size-full" />
              ) : (
                <ProductImage
                  slug={product.slug}
                  imageNum={1}
                  label={product.imageLabelBn}
                  fallbackTone={product.imageTones[0]}
                  className="size-full"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{product.titleBn}</p>
              <p className="text-xs text-ink-soft">
                {formatTk(product.price)} × {qty}
              </p>
            </div>
            <span className="text-sm font-semibold text-ink">{formatTk(lineTotal)}</span>
          </li>
        ))}
      </ul>

      <Separator className="my-4" />

      <dl className="space-y-2.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-muted">Subtotal</dt>
          <dd className="font-medium text-ink">{formatTk(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="min-w-0 text-ink-muted">
            {deliveryZoneLabel ? `Delivery (${deliveryZoneLabel})` : "Delivery charge"}
          </dt>
          <dd className="flex-none whitespace-nowrap font-medium text-ink">
            {delivery === 0 ? "Free" : formatTk(delivery)}
          </dd>
        </div>
        {codFee && codFee > 0 ? (
          <div className="flex justify-between">
            <dt className="text-ink-muted">COD fee</dt>
            <dd className="font-medium text-ink">{formatTk(codFee)}</dd>
          </div>
        ) : null}
        {discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-neem-deep">
              Discount{coupon?.applied ? ` (${coupon.applied})` : ""}
            </dt>
            <dd className="font-medium text-neem-deep">−{formatTk(discount)}</dd>
          </div>
        ) : null}
      </dl>

      {coupon ? (
        <div className="mt-4">
          {coupon.applied ? (
            <div className="rounded-lg border border-neem/30 bg-neem/5 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-neem-deep">
                  <Tag className="size-4" /> {coupon.applied}{coupon.note ? "" : " applied"}
                </span>
                <button
                  type="button"
                  onClick={coupon.onRemove}
                  disabled={coupon.busy}
                  className="flex items-center gap-1 text-xs text-ink-muted transition hover:text-danger"
                  aria-label="Remove coupon"
                >
                  <X className="size-3.5" /> Remove
                </button>
              </div>
              {coupon.note ? <p className="mt-1 text-xs text-terracotta">{coupon.note}</p> : null}
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                value={coupon.input}
                onChange={(e) => coupon.onInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); coupon.onApply(); } }}
                placeholder="Coupon code"
                className="h-10 font-mono uppercase"
                aria-label="Coupon code"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-none"
                onClick={coupon.onApply}
                disabled={coupon.busy || coupon.input.trim() === ""}
              >
                {coupon.busy ? "…" : "Apply"}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      <Separator className="my-4" />

      <div className="flex items-center justify-between">
        <span className="font-semibold text-ink">Total</span>
        <span className="font-display text-2xl font-bold text-ink">{formatTk(total)}</span>
      </div>

      {advanceDueNow && advanceDueNow > 0 ? (
        <div className="mt-4 rounded-lg border border-cream-200 bg-cream-50/60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Advance due now (pre-order)</span>
            <span className="font-semibold text-ink">{formatTk(advanceDueNow)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-ink-muted">Pay on delivery</span>
            <span className="font-medium text-ink">{formatTk(total - advanceDueNow)}</span>
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            Online advance payment goes live soon — for now the full amount is Cash on Delivery.
          </p>
        </div>
      ) : null}

      <Button className="mt-5 w-full" size="lg" onClick={onCta}>
        {ctaLabel}
      </Button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-soft">
        <Lock className="size-3.5" />
        Secure checkout — your details stay private.
      </p>
    </div>
  );
}
