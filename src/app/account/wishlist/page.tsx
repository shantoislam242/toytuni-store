import type { Metadata } from "next";
import { AccountWishlist } from "@/components/account/account-wishlist";

export function generateMetadata(): Metadata {
  return {
    title: "Wishlist",
    robots: { index: false, follow: false },
  };
}

/**
 * `/account/wishlist` — saved products inside the account shell. The layout
 * gates the session; the list itself is client-rendered (wishlist + catalog
 * contexts), so this page is a thin wrapper.
 */
export default function Page() {
  return <AccountWishlist />;
}
