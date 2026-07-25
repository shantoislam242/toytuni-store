"use server";

import { getSessionUser } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeSlugs, mergeWishlistSlugs } from "@/lib/wishlist/merge";

/** `wishlist_items` postpends the generated types (migration 0019), so
 *  reads/writes use the `as never` escape hatch — same as `coupons` /
 *  `admin_users` and the other post-generation tables in this repo. Every call
 *  is scoped to the session user id; the storefront never touches the table
 *  directly (RLS zero-policy, service-role only). Signed-out callers no-op. */
type WishlistRow = { product_slug: string };

/** The signed-in user's saved slugs, oldest-first (insertion order). `[]` for
 *  a signed-out visitor or on any read error (fail-soft). */
export async function getWishlistSlugs(): Promise<string[]> {
  const user = await getSessionUser();
  if (!user) return [];

  const db = createAdminSupabase();
  const { data, error } = await db
    .from("wishlist_items" as never)
    .select("product_slug")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .overrideTypes<WishlistRow[], { merge: false }>();

  if (error) {
    console.error("getWishlistSlugs failed:", error);
    return [];
  }
  return (data ?? []).map((r) => r.product_slug);
}

/**
 * Merge the slugs accumulated while signed out (`localSlugs`) into the user's
 * stored wishlist and return the resulting full list. Called once on sign-in
 * so nothing saved on either side is lost. Signed-out callers get their input
 * back (normalized) — nothing to persist.
 */
export async function syncWishlist(localSlugs: string[]): Promise<string[]> {
  const clean = normalizeSlugs(localSlugs);
  const user = await getSessionUser();
  if (!user) return clean;

  const remote = await getWishlistSlugs();
  const merged = mergeWishlistSlugs(remote, clean);
  const toInsert = merged.filter((slug) => !remote.includes(slug)); // local-only additions

  if (toInsert.length) {
    const db = createAdminSupabase();
    const rows = toInsert.map((slug) => ({ user_id: user.id, product_slug: slug }));
    // Idempotent regardless: the (user_id, product_slug) PK makes re-runs a no-op.
    const { error } = await db
      .from("wishlist_items" as never)
      .upsert(rows as never, { onConflict: "user_id,product_slug", ignoreDuplicates: true });
    if (error) {
      console.error("syncWishlist upsert failed:", error);
      // Persist failed (e.g. the table isn't migrated yet) — keep the list the
      // user can see rather than dropping their local items to a stale/empty
      // remote. localStorage still holds them; a later change retries the sync.
      return merged;
    }
  }
  return merged;
}

/** Save one product for the signed-in user (idempotent). No-op if signed out. */
export async function addWishlistItem(slug: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !slug) return;

  const db = createAdminSupabase();
  const { error } = await db
    .from("wishlist_items" as never)
    .upsert({ user_id: user.id, product_slug: slug } as never, {
      onConflict: "user_id,product_slug",
      ignoreDuplicates: true,
    });
  if (error) console.error("addWishlistItem failed:", error);
}

/** Remove one product from the signed-in user's wishlist. No-op if signed out. */
export async function removeWishlistItem(slug: string): Promise<void> {
  const user = await getSessionUser();
  if (!user || !slug) return;

  const db = createAdminSupabase();
  const { error } = await db
    .from("wishlist_items" as never)
    .delete()
    .eq("user_id", user.id)
    .eq("product_slug", slug);
  if (error) console.error("removeWishlistItem failed:", error);
}

/** Empty the signed-in user's wishlist. No-op if signed out. */
export async function clearWishlist(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;

  const db = createAdminSupabase();
  const { error } = await db.from("wishlist_items" as never).delete().eq("user_id", user.id);
  if (error) console.error("clearWishlist failed:", error);
}
