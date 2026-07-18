import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  total,
  ctaLabel,
  onCta,
  advanceDueNow,
}: {
  items: CartItem[];
  subtotal: number;
  delivery: number;
  /** Zone name for the chosen address (e.g. "Inside Dhaka"), if any. */
  deliveryZoneLabel?: string | null;
  discount: number;
  total: number;
  ctaLabel: string;
  onCta: () => void;
  /** Pre-order advance total (BDT) due now, if any cart line is a pre-order. */
  advanceDueNow?: number;
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
        {discount > 0 ? (
          <div className="flex justify-between">
            <dt className="text-neem-deep">Discount</dt>
            <dd className="font-medium text-neem-deep">−{formatTk(discount)}</dd>
          </div>
        ) : null}
      </dl>

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
