"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { Minus, Plus, ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AnimatedTrashIcon } from "@/components/ui/animated-trash-icon";
import { Separator } from "@/components/ui/separator";
import { ProductImage } from "@/components/product/product-image";
import { OrderOptions } from "@/components/cart/order-options";
import { CouponCode } from "@/components/cart/coupon-code";
import { useCart } from "@/lib/cart/cart-context";
import { formatTk } from "@/lib/format";
import { cn } from "@/lib/utils";

const FREE_SHIPPING_THRESHOLD = 2000;
const FLAT_SHIPPING = 60;
const ACTION_TOAST_DURATION = 8000;
const CART_ACTION_DELAY_MS = 180;

// Shared "danger chip" for the cart's destructive actions (Remove selected /
// Clear cart). Neutral but clearly-affordanced at rest (bordered pill, icon,
// readable text) so both are actually visible; on hover/focus it fills with a
// soft danger tint, reddens the border + text, and lifts a touch — a clear,
// cohesive signal of intent without a loud always-red button fighting the
// Checkout CTA. Accessible focus ring + press feedback included.
const dangerActionClass =
  "trash-host inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-paper px-3.5 py-1.5 text-sm font-semibold text-ink-muted transition-all duration-150 hover:-translate-y-px hover:border-danger/50 hover:bg-danger/10 hover:text-danger hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40 focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

type ConfirmAction = "remove-selected" | "clear-cart";
type RemovedLine = { slug: string; qty: number };

const confirmCopy: Record<
  ConfirmAction,
  { description: string; confirmLabel: string }
> = {
  "remove-selected": {
    description:
      "Are you sure you want to remove the selected item(s) from your cart?",
    confirmLabel: "Remove",
  },
  "clear-cart": {
    description:
      "Are you sure you want to clear your cart? This action cannot be undone.",
    confirmLabel: "Clear Cart",
  },
};

function CartActionConfirmDialog({
  action,
  itemCount,
  processing,
  onOpenChange,
  onConfirm,
}: {
  action: ConfirmAction | null;
  itemCount: number;
  processing: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const copy = action ? confirmCopy[action] : null;
  const countLabel =
    itemCount === 1 ? "1 item selected" : `${itemCount} items selected`;

  return (
    <Dialog.Root
      open={Boolean(action)}
      onOpenChange={(open) => {
        if (processing) return;
        onOpenChange(open);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-cream-300 bg-paper p-5 text-sm text-ink shadow-lg duration-200 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <Dialog.Title className="font-display text-lg font-bold text-ink">
            Confirm Action
          </Dialog.Title>
          <Dialog.Description className="mt-2 leading-6 text-ink-muted">
            {copy?.description}
          </Dialog.Description>
          <p className="mt-2 text-xs font-medium text-ink-soft">
            {countLabel}
          </p>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                disabled={processing}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              ref={confirmRef}
              type="button"
              variant="destructive"
              disabled={processing}
              onClick={onConfirm}
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : null}
              {copy?.confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

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
  const { items, hydrated, addItem, setQty, removeItem, clear } = useCart();
  // Terms agreement lives here so it can gate the Checkout button below.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // Track DESELECTED slugs (default: everything selected). This model auto-keeps
  // new items selected and quietly drops removed ones — no syncing needed.
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  // Bumped on each delete click to play the trash-icon drop animation (purely
  // cosmetic — the confirm/remove flow below is unchanged).
  const [removeAnimKey, setRemoveAnimKey] = useState(0);
  const [clearAnimKey, setClearAnimKey] = useState(0);

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
  const restoreLines = (removedLines: RemovedLine[]) => {
    removedLines.forEach((line) => addItem(line.slug, line.qty));
  };
  const showCartActionToast = (
    action: ConfirmAction,
    removedLines: RemovedLine[],
  ) => {
    const removedCount = removedLines.length;
    const title =
      action === "clear-cart" ? "Cart cleared" : "Selected item(s) removed";
    const description =
      removedCount === 1
        ? "1 item was removed from your cart."
        : `${removedCount} items were removed from your cart.`;

    toast.success(title, {
      description,
      duration: ACTION_TOAST_DURATION,
      action: {
        label: "Undo",
        onClick: () => {
          restoreLines(removedLines);
          toast.success("Cart restored", {
            description:
              removedCount === 1
                ? "1 item was added back to your cart."
                : `${removedCount} items were added back to your cart.`,
          });
        },
      },
    });
  };
  const confirmDestructiveAction = () => {
    if (!confirmAction || processingAction) return;

    const action = confirmAction;
    const removedLines =
      action === "remove-selected"
        ? selectedItems.map((it) => ({ slug: it.product.slug, qty: it.qty }))
        : items.map((it) => ({ slug: it.product.slug, qty: it.qty }));

    if (removedLines.length === 0) return;

    setProcessingAction(true);
    window.setTimeout(() => {
      if (action === "remove-selected") {
        removeSelected();
      }
      if (action === "clear-cart") {
        clear();
      }

      showCartActionToast(action, removedLines);
      setConfirmAction(null);
      setProcessingAction(false);
    }, CART_ACTION_DELAY_MS);
  };
  const openConfirmAction = (action: ConfirmAction) => {
    if (processingAction) return;
    if (action === "remove-selected" && selectedCount === 0) return;
    if (action === "clear-cart" && items.length === 0) return;

    setConfirmAction(action);
  };

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
  const confirmItemCount =
    confirmAction === "clear-cart" ? items.length : selectedCount;

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
          onClick={() => {
            setClearAnimKey((k) => k + 1);
            openConfirmAction("clear-cart");
          }}
          disabled={items.length === 0 || processingAction}
          className={dangerActionClass}
        >
          {processingAction && confirmAction === "clear-cart" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <AnimatedTrashIcon className="size-4" playKey={clearAnimKey} />
          )}
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
                onClick={() => {
                  setRemoveAnimKey((k) => k + 1);
                  openConfirmAction("remove-selected");
                }}
                disabled={selectedCount === 0 || processingAction}
                className={dangerActionClass}
              >
                {processingAction && confirmAction === "remove-selected" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <AnimatedTrashIcon className="size-4" playKey={removeAnimKey} />
                )}
                Remove selected
              </button>
            </div>

          <ul>
          {items.map(({ product, qty, lineTotal }) => (
            <li
              key={product.slug}
              className={cn(
                "flex gap-4 border-b border-cream-300 py-4 opacity-100 transition-opacity duration-200",
                processingAction &&
                  confirmAction === "remove-selected" &&
                  isItemSelected(product.slug) &&
                  "opacity-45",
              )}
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

        {/* coupon code + order summary */}
        <aside className="space-y-6 lg:col-span-1">
          <CouponCode />

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

      <CartActionConfirmDialog
        action={confirmAction}
        itemCount={confirmItemCount}
        processing={processingAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        onConfirm={confirmDestructiveAction}
      />
    </main>
  );
}
