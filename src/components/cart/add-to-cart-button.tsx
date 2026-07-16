"use client";

import { useEffect, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { cn } from "@/lib/utils";

// Only renders after an add-to-cart click, so its portal + particle animation
// code is fetched on demand instead of shipping with every product card.
const CartAddedPopup = dynamic(
  () => import("@/components/cart/cart-added-popup").then((m) => m.CartAddedPopup),
  { ssr: false },
);

/**
 * Adds a product to the cart from a product card. State is derived from cart
 * membership: once the product is in the cart the button locks to "Added" so it
 * can't add duplicates or bump the quantity — quantity is only changed from the
 * cart page's stepper. Tiny client island so ProductCard stays a server
 * component.
 */
export function AddToCartButton({
  slug,
  title,
  className,
  soldOut = false,
}: {
  slug: string;
  title?: string;
  className?: string;
  soldOut?: boolean;
}) {
  const { items, addItem } = useCart();
  const inCart = items.some((it) => it.product.slug === slug);
  const [showPopup, setShowPopup] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!showPopup) return;
    const timeout = window.setTimeout(() => setShowPopup(false), 2600);
    return () => window.clearTimeout(timeout);
  }, [showPopup]);

  const onAdd = () => {
    addItem(slug);
    setShowPopup(true);
  };

  const handleClose = () => setShowPopup(false);

  return (
    <>
      <Button
        size="sm"
        onClick={onAdd}
        disabled={soldOut || inCart}
        aria-label={soldOut ? "Sold out" : inCart ? "Added to cart" : "Add to cart"}
        className={cn(
          "group relative h-10 min-w-[118px] justify-center gap-2 overflow-hidden px-3 text-[0.8rem] font-semibold transition-colors duration-300 sm:h-9",
          !inCart && !soldOut && "hover:text-ink",
          inCart && !soldOut && "bg-neem-deep disabled:opacity-100",
          className,
        )}
      >
        {/* wood-light fill — wipes in from the left on hover (only before added/sold out) */}
        {!inCart && !soldOut ? (
          <span
            aria-hidden
            className="absolute inset-0 origin-left scale-x-0 bg-wood-light transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
          />
        ) : null}
        <motion.div
          layout
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative z-10 inline-flex items-center justify-center gap-2"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={soldOut ? "sold-out" : inCart ? "added" : "add"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="inline-flex items-center gap-2"
            >
              {!soldOut && inCart ? (
                <Check className="size-4" />
              ) : !soldOut ? (
                <ShoppingCart className="size-4" />
              ) : null}
              <span>{soldOut ? "Sold out" : inCart ? "Added" : "Add to Cart"}</span>
            </motion.span>
          </AnimatePresence>
        </motion.div>
      </Button>

      {mounted && showPopup ? (
        <CartAddedPopup title={title} onClose={handleClose} />
      ) : null}
    </>
  );
}
