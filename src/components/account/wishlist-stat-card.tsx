"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { StatCard } from "@/components/account/stat-card";

/**
 * The "Wishlist" Overview tile. Client component because the wishlist lives in
 * `localStorage` (per-device, pre-DB — Phase 2 moves it to a per-user table).
 * Shows a dash until hydrated so server and client markup agree.
 */
export function WishlistStatCard() {
  const { count, hydrated } = useWishlist();
  return (
    <StatCard
      icon={Heart}
      label="Wishlist items"
      value={hydrated ? count : "—"}
      accent="blush"
    />
  );
}
