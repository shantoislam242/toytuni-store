import Link from "next/link";
import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { bottomNav } from "@/lib/mock/nav";

const icon = {
  home: Home,
  grid: LayoutGrid,
  cart: ShoppingCart,
  user: User,
} as const;

/** Fixed bottom navigation — mobile only. */
export function MobileBottomBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {bottomNav.map((item) => {
          const Icon = icon[item.icon];
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="flex flex-col items-center gap-0.5 py-2 text-ink-muted hover:text-neem-deep"
              >
                <Icon className="size-5" />
                <span className="text-[11px]">{item.labelBn}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
