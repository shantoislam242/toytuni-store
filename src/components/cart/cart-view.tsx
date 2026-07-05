"use client";

import { useState } from "react";
import Link from "next/link";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductImage } from "@/components/product/product-image";
import { OrderOptions } from "@/components/cart/order-options";
import { useCart } from "@/lib/cart/cart-context";
import { formatTk } from "@/lib/format";

const FREE_SHIPPING_THRESHOLD = 2000;
const FLAT_SHIPPING = 60;

function QtyStepper({
  qty,
  onDec,
  onInc,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="inline-flex items-center rounded-md border border-cream-300">
      <button
        type="button"
        onClick={onDec}
        aria-label="Decrease quantity"
        className="flex size-8 items-center justify-center text-ink-muted hover:text-ink"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums text-ink">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Increase quantity"
        className="flex size-8 items-center justify-center text-ink-muted hover:text-ink"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

export function CartView() {
  const { items, hydrated, setQty, removeItem, clear } = useCart();
  // Terms agreement lives here so it can gate the Checkout button below.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Track DESELECTED slugs (default: everything selected). This model auto-keeps
  // new items selected and quietly drops removed ones — no syncing needed.
  const [deselected, setDeselected] = useState<Set<string>>(new Set());

  // Avoid rendering the empty state during the pre-hydration flash.
  if (!hydrated) {
    return <main className="mx-auto min-h-[40vh] w-full max-w-6xl flex-1 px-4 py-10" />;
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-cream-300 px-6 py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <ShoppingBag className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink">
            Your cart is empty
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Looks like you haven&apos;t added any toys yet.
          </p>
          <Button asChild className="mt-6">
            <Link href="/collections/all">
              Browse toys
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  // Selection state derived from the deselected set.
  const isItemSelected = (slug: string) => !deselected.has(slug);
  const selectedItems = items.filter((it) => isItemSelected(it.product.slug));
  const selectedCount = selectedItems.length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const selectedSubtotal = selectedItems.reduce((sum, it) => sum + it.lineTotal, 0);

  const toggleItem = (slug: string) =>
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  const toggleAll = () =>
    setDeselected(
      allSelected ? new Set(items.map((it) => it.product.slug)) : new Set(),
    );
  const removeSelected = () =>
    selectedItems.forEach((it) => removeItem(it.product.slug));

  // Totals reflect ONLY the selected items — that's what gets checked out.
  const shipping =
    selectedSubtotal === 0
      ? 0
      : selectedSubtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : FLAT_SHIPPING;
  const total = selectedSubtotal + shipping;
  const remaining = FREE_SHIPPING_THRESHOLD - selectedSubtotal;

  const canCheckout = agreedToTerms && selectedCount > 0;

  // Mock auth for the reward-points block (no real auth on the cart yet).
  const isLoggedIn = false;
  const rewardPoints = 320;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:max-w-[90rem] lg:px-8">
      <header className="flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Your Cart
        </h1>
        <button
          type="button"
          onClick={clear}
          className="text-sm font-medium text-ink-soft underline-offset-4 hover:text-danger hover:underline"
        >
          Clear cart
        </button>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* line items + order options */}
        <div className="space-y-8 lg:col-span-2">
          <div>
            {/* selection bar */}
            <div className="flex items-center justify-between border-b border-cream-300 pb-3">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all items"
                  className="size-4 accent-neem"
                />
                <span className="text-sm font-medium text-ink">
                  Select all{" "}
                  <span className="text-ink-soft">
                    ({selectedCount}/{items.length})
                  </span>
                </span>
              </label>
              <button
                type="button"
                onClick={removeSelected}
                disabled={selectedCount === 0}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-danger disabled:pointer-events-none disabled:opacity-40"
              >
                <Trash2 className="size-4" />
                Remove selected
              </button>
            </div>

          <ul>
          {items.map(({ product, qty, lineTotal }) => (
            <li
              key={product.slug}
              className="flex gap-4 border-b border-cream-300 py-4 first:pt-0"
            >
              <input
                type="checkbox"
                checked={isItemSelected(product.slug)}
                onChange={() => toggleItem(product.slug)}
                aria-label={`Select ${product.titleBn}`}
                className="mt-1 size-4 shrink-0 self-start accent-neem"
              />
              <Link href={`/products/${product.slug}`} className="shrink-0">
                <div className="size-24 overflow-hidden rounded-lg border border-cream-300 bg-frame sm:size-28">
                  <ProductImage
                    slug={product.slug}
                    imageNum={1}
                    label={product.imageLabelBn}
                    fallbackTone={product.imageTones[0]}
                    className="size-full text-xs"
                  />
                </div>
              </Link>

              <div className="flex flex-1 flex-col">
                <div className="flex items-start gap-3">
                  <Link
                    href={`/products/${product.slug}`}
                    className="font-medium text-ink hover:text-neem-deep"
                  >
                    {product.titleBn}
                  </Link>
                </div>

                <span className="mt-0.5 text-sm text-ink-muted">
                  {formatTk(product.price)} each
                </span>

                <div className="mt-auto flex items-center justify-between pt-3">
                  <QtyStepper
                    qty={qty}
                    onDec={() => setQty(product.slug, qty - 1)}
                    onInc={() => setQty(product.slug, qty + 1)}
                  />
                  <span className="font-display text-lg font-bold text-ink">
                    {formatTk(lineTotal)}
                  </span>
                </div>
              </div>
            </li>
          ))}

          <div className="pt-5">
            <Link
              href="/collections/all"
              className="inline-flex items-center gap-1 text-sm font-medium text-neem-deep hover:underline"
            >
              ← Continue shopping
            </Link>
          </div>
          </ul>
          </div>

          <OrderOptions
            isLoggedIn={isLoggedIn}
            rewardPoints={rewardPoints}
            agreedToTerms={agreedToTerms}
            onAgreedToTermsChange={setAgreedToTerms}
          />
        </div>

        {/* order summary */}
        <aside className="lg:col-span-1">
          <div className="rounded-xl border border-cream-300 bg-card p-5 lg:sticky lg:top-[124px]">
            <h2 className="font-display text-lg font-bold text-ink">
              Order Summary
            </h2>

            <p className="mt-1 text-xs text-ink-soft">
              {selectedCount} of {items.length} item{items.length === 1 ? "" : "s"} selected
            </p>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-muted">Subtotal</dt>
                <dd className="font-medium text-ink">{formatTk(selectedSubtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-muted">Shipping</dt>
                <dd className="font-medium text-ink">
                  {shipping === 0 ? "Free" : formatTk(shipping)}
                </dd>
              </div>
            </dl>

            {remaining > 0 && selectedSubtotal > 0 ? (
              <p className="mt-3 rounded-md bg-cream-200 px-3 py-2 text-xs text-ink-muted">
                Add <span className="font-semibold text-ink">{formatTk(remaining)}</span>{" "}
                more for free shipping.
              </p>
            ) : null}

            <Separator className="my-4" />

            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-display text-xl font-bold text-ink">
                {formatTk(total)}
              </span>
            </div>

            {canCheckout ? (
              <Button asChild className="mt-5 w-full" size="lg">
                <Link href="/checkout">
                  Checkout ({selectedCount})
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button type="button" className="mt-5 w-full" size="lg" disabled>
                Checkout
                <ArrowRight className="size-4" />
              </Button>
            )}
            <p className="mt-2 text-center text-xs text-ink-soft">
              {selectedCount === 0
                ? "Select at least one item to check out."
                : !agreedToTerms
                  ? "Agree to the Terms & Conditions to continue."
                  : "You'll review your order on the next step."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
