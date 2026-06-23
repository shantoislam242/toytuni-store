"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Menu,
  Search,
  ShoppingCart,
  Heart,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { mainNav, ageNav, categoryNav, type NavLink } from "@/lib/mock/nav";
import { BRAND_NAME } from "@/lib/config";
import { CartBadge } from "@/components/cart/cart-badge";
import { WishlistBadge } from "@/components/product/wishlist-badge";
import { cn } from "@/lib/utils";

// Shared style for every top-level drawer item (accordion triggers + direct
// links) so the mobile menu reads as one consistent list.
const drawerItemClass =
  "px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:text-neem-deep hover:no-underline";

function SearchBox({ className }: { className?: string }) {
  return (
    <form action="/search" className={className} role="search">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <Input
          name="q"
          placeholder="Search toys…"
          aria-label="Search"
          className="h-9 bg-cream-50 pl-8"
        />
      </div>
    </form>
  );
}

function NavDropdown({ label, links }: { label: string; links: NavLink[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group/nav inline-flex items-center gap-1 text-[15px] font-medium text-ink outline-none transition-colors duration-200 hover:text-neem-deep data-[state=open]:text-neem-deep">
        {label}
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/nav:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44">
        {links.map((l) => (
          <DropdownMenuItem key={l.href} asChild>
            <Link href={l.href}>{l.labelBn}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DrawerList({
  links,
  onNavigate,
}: {
  links: NavLink[];
  onNavigate: () => void;
}) {
  return (
    <ul className="space-y-0.5">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            onClick={onNavigate}
            className="block rounded-md py-2 pl-4 pr-2 text-sm text-ink-muted hover:bg-cream-200 hover:text-ink"
          >
            {l.labelBn}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  // On scroll-down the search hides and the header shrinks; near the top it
  // expands again.
  //
  // WHY THIS DOESN'T "JUMP": collapse changes the header's layout height, which
  // reflows the page by ~48px. To stop that reflow from bouncing scrollY back
  // across the trigger (the previous infinite-flicker bug), we use HYSTERESIS —
  // two thresholds far apart:
  //   collapse only when scrollY > 120
  //   expand   only when scrollY <  40
  // The 80px dead-zone between them is wider than the ~48px reflow, so the
  // height change can never cross both thresholds -> no oscillation, just one
  // smooth condense.
  const [collapsed, setCollapsed] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setCollapsed((prev) => {
        if (!prev && y > 120) return true; // collapse
        if (prev && y < 40) return false; // expand
        return prev; // dead-zone: keep current state
      });
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 bg-background pb-3 transition-shadow duration-300",
        collapsed && "shadow-md",
      )}
    >
      {/* top bar — brand, search, icons. Height shrinks on collapse. */}
      <div
        className={cn(
          "mx-auto flex max-w-6xl items-center gap-4 px-4 transition-all duration-300 sm:px-6",
          collapsed ? "h-16" : "h-20 md:h-24",
        )}
      >
        {/* left: hamburger (mobile) + brand */}
        <div className="flex items-center gap-1">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] p-0">
              <SheetHeader className="border-b border-cream-300">
                <SheetTitle className="font-display text-xl text-ink">
                  {BRAND_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-8">
                <SearchBox className="py-3" />

                {/* One uniform list. By Age / By Category expand in place; the
                    rest are direct links — all share the same top-level style. */}
                <nav className="flex flex-col pt-1">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="age" className="border-none">
                      <AccordionTrigger className={drawerItemClass}>
                        By Age
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <DrawerList links={ageNav} onNavigate={close} />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="category" className="border-none">
                      <AccordionTrigger className={drawerItemClass}>
                        By Category
                      </AccordionTrigger>
                      <AccordionContent className="pb-1">
                        <DrawerList links={categoryNav} onNavigate={close} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {mainNav.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={close}
                      className={drawerItemClass}
                    >
                      {l.labelBn}
                    </Link>
                  ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            href="/"
            className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl"
          >
            {BRAND_NAME}
          </Link>
        </div>

        {/* center: search (desktop) — width + opacity collapse on scroll-down */}
        <div
          className={cn(
            "mx-auto hidden w-full min-w-0 overflow-hidden transition-all duration-300 ease-in-out md:block",
            collapsed ? "max-w-0 opacity-0" : "max-w-md opacity-100",
          )}
        >
          <SearchBox className="w-full" />
        </div>

        {/* right: search (mobile) + wishlist (desktop) + cart */}
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Search"
          >
            <Link href="/search">
              <Search className="size-5" />
            </Link>
          </Button>
          {/* Wishlist — visible on all sizes (mobile reaches Cart via the
              bottom bar, so the header surfaces Wishlist instead). */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Wishlist"
          >
            <Link href="/wishlist" className="relative">
              <Heart className="size-5" />
              <WishlistBadge className="absolute -right-0.5 -top-0.5 size-4" />
            </Link>
          </Button>
          {/* Cart — desktop only (mobile uses the fixed bottom bar). */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Cart"
            className="relative ml-2 hidden md:inline-flex"
          >
            <Link href="/cart">
              <ShoppingCart className="size-5" />
              <CartBadge className="absolute -right-0.5 -top-0.5 size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* desktop nav row — shrinks its vertical padding on collapse */}
      <nav className="hidden border-t border-cream-300 md:block">
        <div
          className={cn(
            "mx-auto flex max-w-6xl items-center justify-center gap-10 px-6 transition-all duration-300 lg:gap-14",
            collapsed ? "py-2" : "py-4",
          )}
        >
          <Link
            href="/"
            className="text-[15px] font-medium text-ink transition-colors duration-200 hover:text-neem-deep"
          >
            Home
          </Link>
          <Link
            href="/collections/all"
            className="text-[15px] font-medium text-ink transition-colors duration-200 hover:text-neem-deep"
          >
            All Products
          </Link>
          <NavDropdown label="By Age" links={ageNav} />
          <NavDropdown label="By Category" links={categoryNav} />
          {mainNav.slice(2).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[15px] font-medium text-ink transition-colors duration-200 hover:text-neem-deep"
            >
              {l.labelBn}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}