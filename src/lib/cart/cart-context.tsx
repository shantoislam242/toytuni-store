"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCatalog } from "@/lib/catalog/catalog-context";
import type { Product } from "@/lib/types";

/** Minimal persisted unit: just what the user chose. Price/title are resolved
 * from the DB-hydrated catalogue at render time, so the cart never holds stale
 * data. */
type CartLine = { slug: string; qty: number };

/** A resolved cart line ready for display. */
export type CartItem = { product: Product; qty: number; lineTotal: number };

type CartContextValue = {
  items: CartItem[];
  count: number; // number of distinct products (a product counts once, any qty)
  subtotal: number; // BDT
  hydrated: boolean; // false until localStorage is read (avoids SSR mismatch)
  addItem: (slug: string, qty?: number) => void;
  removeItem: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "toy-store-cart-v1";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const catalog = useCatalog();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted cart once, on the client only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLines(
            parsed.filter(
              (l): l is CartLine =>
                l &&
                typeof l.slug === "string" &&
                typeof l.qty === "number" &&
                l.qty > 0,
            ),
          );
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  // Persist on change — but only after hydration, so we never overwrite a
  // stored cart with the empty initial state on first render.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      // storage full / unavailable — non-fatal
    }
  }, [lines, hydrated]);

  const addItem = useCallback((slug: string, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.slug === slug);
      if (existing) {
        return prev.map((l) =>
          l.slug === slug ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [...prev, { slug, qty }];
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const setQty = useCallback((slug: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, qty } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const items = useMemo<CartItem[]>(() => {
    return lines.flatMap((l) => {
      const product = catalog.bySlug(l.slug);
      return product
        ? [{ product, qty: l.qty, lineTotal: product.price * l.qty }]
        : [];
    });
  }, [lines, catalog]);

  // Distinct products in the cart — the same product counts once no matter its
  // quantity (drives the header cart badge).
  const count = items.length;
  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.lineTotal, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      hydrated,
      addItem,
      removeItem,
      setQty,
      clear,
    }),
    [items, count, subtotal, hydrated, addItem, removeItem, setQty, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
