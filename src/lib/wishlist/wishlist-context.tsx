"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  syncWishlist,
  addWishlistItem,
  removeWishlistItem,
  clearWishlist,
} from "@/lib/wishlist/actions";

type WishlistContextValue = {
  slugs: string[]; // saved product slugs, in insertion order
  count: number;
  hydrated: boolean; // false until localStorage is read (avoids SSR mismatch)
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "toy-store-wishlist-v1";
const WishlistContext = createContext<WishlistContextValue | null>(null);

/**
 * Wishlist state, persisted to `localStorage` for everyone and — for signed-in
 * users — mirrored to a per-user DB table (`wishlist_items`) so the list
 * follows them across devices. On sign-in the local list is merged into the
 * stored one (`syncWishlist`); thereafter each mutation is echoed to the DB
 * fire-and-forget while `localStorage` stays a same-device cache. The public
 * API is unchanged — every existing consumer (product hearts, badges, the
 * account sidebar/stat) keeps working without knowing about the DB.
 */
export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  // Latest slugs, readable inside the sign-in effect without making it depend
  // on `slugs` (which would re-run the merge on every toggle).
  const slugsRef = useRef<string[]>(slugs);
  slugsRef.current = slugs;
  // Guards against re-syncing the same session repeatedly.
  const syncedUserRef = useRef<string | null>(null);

  // Load persisted wishlist once, on the client only.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSlugs(parsed.filter((s): s is string => typeof s === "string"));
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  // On sign-in, merge the local list into the user's stored wishlist and adopt
  // the union. On sign-out, arm the guard so the next sign-in re-syncs.
  useEffect(() => {
    if (!hydrated) return;
    if (!userId) {
      syncedUserRef.current = null;
      return;
    }
    if (syncedUserRef.current === userId) return;
    syncedUserRef.current = userId;

    let active = true;
    syncWishlist(slugsRef.current)
      .then((merged) => {
        if (active) setSlugs(merged);
      })
      .catch((e) => {
        // Sync failed — keep the local list; allow a retry on the next change.
        console.error("wishlist sync failed:", e);
        if (syncedUserRef.current === userId) syncedUserRef.current = null;
      });
    return () => {
      active = false;
    };
  }, [userId, hydrated]);

  // Persist on change — only after hydration, so the empty initial state never
  // clobbers a stored wishlist on first render.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      // storage unavailable — non-fatal
    }
  }, [slugs, hydrated]);

  const has = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const toggle = useCallback(
    (slug: string) => {
      setSlugs((prev) => {
        const exists = prev.includes(slug);
        // Echo to the DB for signed-in users (fire-and-forget — localStorage +
        // state remain the same-device source of truth if the network fails).
        if (syncedUserRef.current) {
          void (exists ? removeWishlistItem(slug) : addWishlistItem(slug));
        }
        return exists ? prev.filter((s) => s !== slug) : [...prev, slug];
      });
    },
    [],
  );

  const remove = useCallback((slug: string) => {
    if (syncedUserRef.current) void removeWishlistItem(slug);
    setSlugs((prev) => prev.filter((s) => s !== slug));
  }, []);

  const clear = useCallback(() => {
    if (syncedUserRef.current) void clearWishlist();
    setSlugs([]);
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      slugs,
      count: slugs.length,
      hydrated,
      has,
      toggle,
      remove,
      clear,
    }),
    [slugs, hydrated, has, toggle, remove, clear],
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
