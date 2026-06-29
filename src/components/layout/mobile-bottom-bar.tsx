"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { bottomNav } from "@/lib/mock/nav";
import { isBareRoute } from "@/lib/routes";
import { CartBadge } from "@/components/cart/cart-badge";

const icon = {
  home: Home,
  grid: LayoutGrid,
  cart: ShoppingCart,
  user: User,
} as const;

/** Fixed bottom navigation — mobile only. Hidden on bare routes (e.g. auth). */
export function MobileBottomBar() {
  const pathname = usePathname();
  // Focused surfaces (sign in / sign up) skip the bottom bar along with the
  // header for a clean, distraction-free screen.
  if (isBareRoute(pathname)) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-paper pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {bottomNav.map((item) => {
          const Icon = icon[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2 text-ink-muted hover:text-neem-deep"
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {item.icon === "cart" ? (
                    <CartBadge className="absolute -right-2 -top-1 size-4" />
                  ) : null}
                </span>
                <span className="text-[11px]">{item.labelBn}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
