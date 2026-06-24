"use client";

import { toast } from "sonner";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart/cart-context";
import { cn } from "@/lib/utils";

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
}: {
  slug: string;
  title?: string;
  className?: string;
}) {
  const { items, addItem } = useCart();
  const inCart = items.some((it) => it.product.slug === slug);

  const onAdd = () => {
    addItem(slug);
    toast.success("Added to Cart", {
      description: title,
    });
  };

  return (
    <Button
      size="sm"
      onClick={onAdd}
      disabled={inCart}
      aria-label={inCart ? "Added to cart" : "Add to cart"}
      // Keep full colour when locked (override the default disabled fade).
      className={cn(inCart && "bg-neem-deep disabled:opacity-100", className)}
    >
      {inCart ? (
        <Check className="size-4" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      <span className="sr-only sm:not-sr-only">{inCart ? "Added" : "Add"}</span>
    </Button>
  );
}
