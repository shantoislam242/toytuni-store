"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Building2,
  Minus,
  Plus,
  Receipt,
  Search,
  Truck,
} from "lucide-react";
import { ProductImage } from "@/components/product/product-image";
import { useCart } from "@/lib/cart/cart-context";
import { formatTk } from "@/lib/format";
import { useCatalog, isShelfProduct } from "@/lib/catalog/catalog-context";
import { cn } from "@/lib/utils";

/** Minimum units per product for a bulk order. Pricing is unchanged — this is a
 *  quantity floor, not a discount tier. */
const MIN_QTY = 5;

/** Free-delivery threshold (BDT), mirrored from the hero copy. */
const FREE_DELIVERY_OVER = 1000;

/** The three ground rules shown as a strip above the grid. */
const RULES = [
  {
    icon: Boxes,
    title: "Every product, in bulk",
    desc: "Build one order across the full catalogue — no minimum SKU count.",
  },
  {
    icon: Receipt,
    title: `Minimum ${MIN_QTY} per product`,
    desc: "Add a product and its quantity starts at five; step up from there.",
  },
  {
    icon: Truck,
    title: `Free delivery over ${formatTk(FREE_DELIVERY_OVER)}`,
    desc: "Pan-Bangladesh shipping, free once your order clears the threshold.",
  },
] as const;

/** Compact +/- stepper for a selected product line. Mirrors the cart stepper;
 *  decrementing at the floor removes the product from the order. */
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
    <div className="inline-flex items-center rounded-md border border-cream-300 bg-paper">
      <button
        type="button"
        onClick={onDec}
        aria-label={qty <= MIN_QTY ? "Remove from order" : "Decrease quantity"}
        className="flex size-9 items-center justify-center text-ink-muted transition-colors hover:text-ink"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="w-9 text-center text-sm font-semibold tabular-nums text-ink">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Increase quantity"
        className="flex size-9 items-center justify-center text-ink-muted transition-colors hover:text-ink"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Bulk order builder: search + a grid of every product, each with a quantity
 * stepper enforcing a five-unit minimum. Selected lines roll up into a sticky
 * order bar (optional GST / shop name, live grand total) that pushes the
 * selection into the shared cart and hands off to /checkout.
 *
 * Client island — owns its own per-product quantities (not persisted); only the
 * final checkout writes to the cart. Prices are flat, so line totals are simply
 * price × quantity.
 */
export function BulkOrderBuilder() {
  const router = useRouter();
  const { items, addItem, setQty: setCartQty } = useCart();
  const { all } = useCatalog();
  const [query, setQuery] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [gstNo, setGstNo] = useState("");
  const [shopName, setShopName] = useState("");

  // Bulk covers the shelf catalogue only — gift kits / cards stay out, as before.
  const shelf = useMemo(() => all.filter(isShelfProduct), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shelf;
    return shelf.filter(
      (p) =>
        p.titleBn.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q),
    );
  }, [query, shelf]);

  const setQty = (slug: string, qty: number) =>
    setQtys((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[slug];
      else next[slug] = qty;
      return next;
    });

  const selected = useMemo(
    () =>
      shelf
        .filter((p) => (qtys[p.slug] ?? 0) >= MIN_QTY)
        .map((p) => ({ product: p, qty: qtys[p.slug], lineTotal: p.price * qtys[p.slug] })),
    [qtys, shelf],
  );

  const totalUnits = selected.reduce((n, l) => n + l.qty, 0);
  const grandTotal = selected.reduce((n, l) => n + l.lineTotal, 0);
  const hasSelection = selected.length > 0;

  const handleCheckout = () => {
    if (!hasSelection) return;
    const inCart = new Set(items.map((it) => it.product.slug));
    for (const { product, qty } of selected) {
      if (inCart.has(product.slug)) setCartQty(product.slug, qty);
      else addItem(product.slug, qty);
    }
    router.push("/checkout");
  };

  return (
    <section
      id="order"
      className="mx-auto w-full max-w-[80rem] scroll-mt-24 px-4 py-12 sm:px-6 lg:px-8"
    >
      <div className="text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
          Order in bulk
        </span>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Build your wholesale order
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-ink-muted">
          Pick from the full range and set quantities — minimum five units per
          product. Your selection carries straight into checkout.
        </p>
      </div>

      {/* three ground rules */}
      <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {RULES.map((rule, i) => {
          const Icon = rule.icon;
          return (
            <li
              key={rule.title}
              className="flex items-start gap-3 rounded-2xl border border-cream-200 bg-cream-50/60 p-4"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-full bg-neem/10 text-neem">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-neem-deep">
                    {i + 1}
                  </span>
                  <h3 className="font-bold text-ink">{rule.title}</h3>
                </div>
                <p className="mt-0.5 text-sm text-ink-muted">{rule.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* search */}
      <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-full border border-cream-300 bg-cream-50/60 px-4 py-2.5 transition-colors focus-within:border-neem">
        <Search className="size-4 flex-none text-ink-soft" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
        />
      </div>

      {/* product grid */}
      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-ink-muted">
          No products match “{query.trim()}”.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => {
            const qty = qtys[product.slug] ?? 0;
            const active = qty >= MIN_QTY;
            return (
              <div
                key={product.slug}
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl border bg-paper shadow-sm transition-colors",
                  active ? "border-neem" : "border-cream-200",
                )}
              >
                <div className="relative aspect-square bg-cream-50">
                  <ProductImage
                    slug={product.slug}
                    imageNum={1}
                    label={product.imageLabelBn}
                    fallbackTone={product.imageTones[0]}
                    className="absolute inset-0"
                  />
                  {active ? (
                    <span className="absolute right-2 top-2 rounded-full bg-neem px-2 py-0.5 text-[11px] font-bold text-paper tabular-nums">
                      {qty}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col p-3">
                  <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-ink">
                    {product.titleBn}
                  </h3>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-display font-bold text-neem-deep">
                      {formatTk(product.price)}
                    </span>
                    {active ? (
                      <span className="text-xs text-ink-muted tabular-nums">
                        = {formatTk(product.price * qty)}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    {active ? (
                      <QtyStepper
                        qty={qty}
                        onDec={() =>
                          setQty(product.slug, qty <= MIN_QTY ? 0 : qty - 1)
                        }
                        onInc={() => setQty(product.slug, qty + 1)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setQty(product.slug, MIN_QTY)}
                        className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-cream-300 bg-cream-50 text-sm font-semibold text-ink transition-colors hover:border-neem hover:bg-neem/5"
                      >
                        <Plus className="size-3.5" />
                        Add {MIN_QTY}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* sticky order bar — only while something is selected */}
      {hasSelection ? (
        <>
          {/* spacer so the fixed bar never hides page content */}
          <div aria-hidden className="h-40 sm:h-28" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-paper/95 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur">
            <div className="mx-auto flex w-full max-w-[80rem] flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-6 lg:px-8">
              {/* optional business fields */}
              <div className="order-2 grid w-full grid-cols-2 gap-2 sm:order-1 sm:w-auto sm:flex-1">
                <div className="flex items-center gap-2 rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2 transition-colors focus-within:border-neem">
                  <Receipt className="size-4 flex-none text-ink-soft" aria-hidden />
                  <input
                    value={gstNo}
                    onChange={(e) => setGstNo(e.target.value)}
                    placeholder="GST No. (optional)"
                    aria-label="GST number (optional)"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-cream-300 bg-cream-50/60 px-3 py-2 transition-colors focus-within:border-neem">
                  <Building2 className="size-4 flex-none text-ink-soft" aria-hidden />
                  <input
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="Shop name (optional)"
                    aria-label="Shop name (optional)"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
                  />
                </div>
              </div>

              {/* total */}
              <div className="order-1 flex-none text-left sm:order-2 sm:text-right">
                <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                  {selected.length} product{selected.length === 1 ? "" : "s"} ·{" "}
                  {totalUnits} unit{totalUnits === 1 ? "" : "s"}
                </div>
                <div className="font-display text-xl font-bold text-ink tabular-nums">
                  {formatTk(grandTotal)}
                </div>
              </div>

              {/* checkout */}
              <button
                type="button"
                onClick={handleCheckout}
                className="order-3 inline-flex h-12 flex-none items-center justify-center gap-2 rounded-md bg-neem px-6 text-sm font-bold text-paper transition-colors hover:bg-neem-deep max-sm:w-full"
              >
                Add to Cart &amp; Checkout
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
