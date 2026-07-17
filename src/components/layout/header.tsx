"use client";

import {
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Search,
  ShoppingCart,
  Heart,
  ChevronDown,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SmartSearch } from "@/components/search/smart-search";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  mainNav,
  ageNav,
  categoryNav,
  categoryGroups,
  type NavLink,
} from "@/lib/mock/nav";
import { ageTiers } from "@/lib/mock/age-tiers";
import type { Tone } from "@/lib/types";
import { BRAND_NAME } from "@/lib/config";
import { isBareRoute } from "@/lib/routes";
import { CartBadge } from "@/components/cart/cart-badge";
import { WishlistBadge } from "@/components/product/wishlist-badge";
import { useAuth } from "@/lib/auth/auth-context";
import { useHomeReset } from "@/components/layout/home-reset";
import { clearPlpState } from "@/lib/plp-state";
import { cn } from "@/lib/utils";

// Shared style for every top-level drawer item (accordion triggers + direct
// links) so the mobile menu reads as one consistent list.
const drawerItemClass =
  "px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:text-neem-deep hover:no-underline";

const headerContainerClass =
  "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:max-w-[90rem] lg:px-8";

/** Is `href` the current page? Exact for "/", prefix-match for sections. */
function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Same-route navigation UX. Going to a *different* page uses normal Next.js
 * client-side navigation (let the <Link> proceed). Clicking the item for the
 * page you're already on does NOT reload — it smoothly scrolls to the top
 * instead (honouring reduced-motion). Any open mobile menu is closed first, and
 * the active item is never disabled. Used by every nav link and the logo.
 */
function navClick(
  e: ReactMouseEvent<HTMLElement>,
  href: string,
  pathname: string,
  closeMenu?: () => void,
) {
  closeMenu?.(); // close the mobile menu before navigating or scrolling
  if (href === pathname) {
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }
}

// Premium desktop nav item: color shifts to neem on hover/active and an
// accent underline grows from the centre. Shared by links and dropdowns so the
// whole row animates identically. Layout/typography are unchanged.
// Weight is normal by default and turns bold only once the nav condenses onto
// the brand row — driven by the `group/navrow` data-attribute on the nav row,
// so it hits just these top-level items (not the dropdown/mega-menu contents).
// Static tone → dot-colour map (literal classes so Tailwind keeps them) — used
// by the By Age mega-menu tiers.
const toneDot: Record<Tone, string> = {
  cream: "bg-cream-200",
  neem: "bg-neem",
  "neem-soft": "bg-neem-soft",
  wood: "bg-wood-light",
  terracotta: "bg-terracotta",
  mustard: "bg-mustard",
  "dusty-blue": "bg-dusty-blue",
  blush: "bg-blush",
};

const navItemBase =
  "group/navitem relative inline-flex shrink-0 items-center whitespace-nowrap px-2 [font-family:Helvetica,Arial,sans-serif] text-[13px] font-bold leading-[23.1px] tracking-[0.5px] outline-none transition-colors duration-200 xl:text-[14px] xl:tracking-[0.7px] " +
  "after:pointer-events-none after:absolute after:-bottom-1.5 after:inset-x-2 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-neem after:transition-transform after:duration-300 after:ease-out " +
  "hover:text-neem-deep hover:after:scale-x-100 focus-visible:text-neem-deep focus-visible:after:scale-x-100";

/**
 * Desktop top-level nav link. The active state is derived from the current
 * route, so it always reflects the page you're on — navigating anywhere
 * (including Home via the logo) updates it and it's never stuck on a past item.
 */
function NavItem({
  href,
  label,
  active,
  pathname,
}: {
  href: string;
  label: string;
  active: boolean;
  pathname: string;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => navClick(e, href, pathname)}
      aria-current={active ? "page" : undefined}
      className={cn(
        navItemBase,
        active ? "text-neem-deep after:scale-x-100" : "text-ink",
      )}
    >
      {label}
    </Link>
  );
}

/**
 * Desktop "By Age" mega-menu. Uses the SAME centered dropdown card as
 * CategoryMega (matching size + behaviour), laid out as one column per age
 * tier — tone dot, label and tagline. Opens on hover (fine pointers) or click;
 * closes on Escape, outside-click, or link choice. Mobile uses the drawer list.
 */
function AgeMega({ pathname }: { pathname: string }) {
  const active = ageTiers.some((t) => isActivePath(pathname, t.href));

  const [open, setOpen] = useState(false);
  const [hoverable, setHoverable] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverable(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setHoverable(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const hoverOpen = () => {
    if (!hoverable) return;
    cancelClose();
    setOpen(true);
  };
  const hoverClose = () => {
    if (!hoverable) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        data-state={open ? "open" : "closed"}
        className={cn(
          navItemBase,
          "gap-1 data-[state=open]:text-neem-deep data-[state=open]:after:scale-x-100",
          active ? "text-neem-deep after:scale-x-100" : "text-ink",
        )}
      >
        By Age
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/navitem:rotate-180" />
      </button>

      {/* Centered dropdown card — identical shell to CategoryMega. */}
      <div
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
        aria-hidden={!open}
        className={cn(
          "absolute left-1/2 top-full z-40 mt-2 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-cream-200 bg-paper shadow-xl shadow-ink/10 transition-all duration-200 ease-out",
          open
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
          {ageTiers.map((t) => {
            const itemActive = isActivePath(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                onClick={(e) => navClick(e, t.href, pathname, () => setOpen(false))}
                aria-current={itemActive ? "page" : undefined}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:border-neem hover:bg-accent/50 focus-visible:border-neem focus-visible:bg-accent/50 focus-visible:outline-none",
                  itemActive ? "border-neem bg-accent/50" : "border-cream-200",
                )}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={cn("size-2.5 flex-none rounded-full", toneDot[t.tone])}
                    aria-hidden
                  />
                  <span className="font-display text-base font-bold text-ink">
                    {t.labelBn}
                  </span>
                </span>
                {t.taglineBn ? (
                  <span className="text-sm text-ink-muted">{t.taglineBn}</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Desktop "By Category" mega-menu: a full-width panel (spanning the sticky
 * header edge-to-edge) that drops below the nav row and lays the category
 * taxonomy out in titled columns. Opens on hover for fine pointers and on click
 * otherwise; closes on Escape, outside click, or when a link is chosen. The
 * panel stays mounted and animates via opacity/translate so both the open and
 * the close are smooth. Mobile uses the flat drawer list instead.
 */
function CategoryMega({ pathname }: { pathname: string }) {
  const active = categoryGroups.some((g) =>
    g.links.some((l) => isActivePath(pathname, l.href)),
  );

  const [open, setOpen] = useState(false);
  const [hoverable, setHoverable] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHoverable(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setHoverable(e.matches);
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const hoverOpen = () => {
    if (!hoverable) return;
    cancelClose();
    setOpen(true);
  };
  // A short delay lets the cursor cross the gap between the trigger and the
  // panel without the menu flickering shut.
  const hoverClose = () => {
    if (!hoverable) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  // Escape + outside-click close (covers click-opened menus on touch/keyboard).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        data-state={open ? "open" : "closed"}
        className={cn(
          navItemBase,
          "gap-1 data-[state=open]:text-neem-deep data-[state=open]:after:scale-x-100",
          active ? "text-neem-deep after:scale-x-100" : "text-ink",
        )}
      >
        By Category
        <ChevronDown className="size-4 transition-transform duration-200 group-data-[state=open]/navitem:rotate-180" />
      </button>

      {/* Full-width panel. Its offset parent is the sticky <header>, so it spans
          the header edge-to-edge and drops just below the nav row. Stays mounted
          (visibility toggled) so opacity/translate animate on open AND close. */}
      <div
        onMouseEnter={hoverOpen}
        onMouseLeave={hoverClose}
        aria-hidden={!open}
        className={cn(
          // Centered dropdown card, width ~ the nav row (Home→Contact) rather
          // than spanning the whole header. -translate-x-1/2 centers it under
          // the (centered) nav; translate-y toggles the open/close slide.
          "absolute left-1/2 top-full z-40 mt-2 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-cream-200 bg-paper shadow-xl shadow-ink/10 transition-all duration-200 ease-out",
          open
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 p-6 sm:grid-cols-3 lg:grid-cols-4">
          {categoryGroups.map((g) => (
            <div key={g.heading}>
              <p className="mb-3 font-display text-base font-bold text-ink">
                {g.heading}
              </p>
              <ul className="space-y-2.5">
                {g.links.map((l) => {
                  const itemActive = isActivePath(pathname, l.href);
                  return (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={(e) => navClick(e, l.href, pathname, () => setOpen(false))}
                        aria-current={itemActive ? "page" : undefined}
                        className={cn(
                          // Same green highlight as the By Age dropdown items
                          // (bg-accent / text-accent-foreground) on hover + focus.
                          "block -mx-2 rounded-md px-2 py-1.5 text-sm text-ink-muted transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
                          itemActive && "font-medium text-neem-deep",
                        )}
                      >
                        {l.labelBn}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrawerList({
  links,
  onNavigate,
  pathname,
}: {
  links: NavLink[];
  onNavigate: () => void;
  pathname: string;
}) {
  return (
    <ul className="space-y-0.5">
      {links.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            onClick={(e) => navClick(e, l.href, pathname, onNavigate)}
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
  // Mobile-only: the header search icon reveals a full-width search bar.
  const [mobileSearch, setMobileSearch] = useState(false);
  // On scroll-down the search, wishlist, sign-in and cart hide and the header
  // shrinks — leaving just the brand and nav; near the top it expands again.
  //
  // WHY THIS DOESN'T "JUMP": collapse changes the header's layout height, which
  // reflows the page. Now that the nav rises onto the brand row the header drops
  // from ~163px to ~76px, so the reflow is ~87px (up from ~48px before). Scroll
  // anchoring nudges scrollY by that amount; to stop it bouncing back across a
  // trigger (the previous infinite-flicker bug) we use HYSTERESIS — two
  // thresholds far apart:
  //   collapse only when scrollY > 170
  //   expand   only when scrollY <  40
  // The 130px dead-zone between them is wider than the ~87px reflow, so the
  // height change can never cross both thresholds -> no oscillation, just one
  // smooth condense.
  const [collapsed, setCollapsed] = useState(false);
  // Tablet/desktop: the search icon reopens the collapsed bar IN PLACE (no jump
  // back to the top), so you can search from wherever you've scrolled to.
  const [searchOpen, setSearchOpen] = useState(false);
  // Active nav item is derived from the current route, so it always tracks the
  // page you're on (logo → Home included) and is never stuck on a past item.
  const pathname = usePathname();
  const { triggerHomeReset } = useHomeReset();
  // Auth-aware account affordance. While the session is still resolving, treat
  // the user as signed out so the first paint shows "Sign in" (never a flash of
  // "Account" that then disappears).
  const { user, loading } = useAuth();
  const isLoggedIn = !loading && !!user;
  const close = () => setOpen(false);

  // Brand logo: always go Home and "reset all". Forget every collection's
  // remembered filters/sort/view so listings start fresh next visit, and — if
  // already on Home — scroll to top (via navClick) and remount the page content
  // to return every section to its defaults.
  const onBrandClick = (e: ReactMouseEvent<HTMLElement>) => {
    clearPlpState();
    navClick(e, "/", pathname, close);
    if (pathname === "/") triggerHomeReset();
  };

  // Collapsed-state search affordance: the centre bar is hidden once the header
  // condenses, so the search icon reopens it right where you are — the page does
  // NOT jump back to the top — and drops the caret straight into the input.
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const revealSearch = () => {
    setSearchOpen(true);
    // Focus on the next frame, once the bar has rendered back open.
    requestAnimationFrame(() => {
      searchWrapRef.current
        ?.querySelector<HTMLInputElement>('input[aria-label="Search"]')
        ?.focus({ preventScroll: true });
    });
  };

  // Clicking away from an EMPTY manually-opened bar folds it back to the icon —
  // a half-open, unused search bar is just clutter. A typed query is kept (you
  // may be reaching for a suggestion), and focus moving to anything inside the
  // search (suggestions, clear, mic) doesn't count as leaving.
  const onSearchBlur = (e: ReactFocusEvent<HTMLDivElement>) => {
    if (!searchOpen) return;
    const next = e.relatedTarget as Node | null;
    if (next && searchWrapRef.current?.contains(next)) return;
    const input = searchWrapRef.current?.querySelector<HTMLInputElement>(
      'input[aria-label="Search"]',
    );
    if (!input?.value.trim()) setSearchOpen(false);
  };

  // Back near the top the bar is shown normally again, so drop the override.
  useEffect(() => {
    if (!collapsed) setSearchOpen(false);
  }, [collapsed]);

  // The bar hides only while the header is condensed AND the user hasn't asked
  // for it — this drives both the bar and the icon that stands in for it.
  const searchHidden = collapsed && !searchOpen;

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      setCollapsed((prev) => {
        if (!prev && y > 170) return true; // collapse
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

  // Auth routes go bare — render nothing so there's no header/nav chrome.
  // (Placed AFTER all hooks so the Rules of Hooks hold across navigations.)
  if (isBareRoute(pathname)) return null;

  return (
    <header
      className="sticky top-0 z-50 bg-paper lg:pb-3"
    >
      {/* Header content is a plain vertical stack: brand row, then the nav
          below it. On scroll-down the nav does NOT re-flow to a new row (a flex
          wrap change can't be animated) — instead it RISES via an animating
          negative margin-top while the brand row's height animates down, so the
          whole condense is one smooth, continuous motion. */}
      <div className={headerContainerClass}>
      {/* brand row — brand, search, icons. Full-width block in both states. */}
      <div
        className={cn(
          "flex items-center gap-4 transition-[height] duration-200 ease-out",
          // Mobile height is constant (h-20); md+ condenses in one continuous
          // motion together with the nav rise and the search/icons fade — all
          // driven off `collapsed`, all the same 200ms ease-out. The row is a
          // full-width block throughout, so the search (mx-auto) and icons
          // (ml-auto) fade IN PLACE and never snap sideways.
          collapsed ? "h-13 md:h-16 lg:h-16" : "h-16 md:h-24 lg:h-24",
        )}
      >
        {/* left: brand — always goes Home; if already Home it scrolls to top
            (never disabled / no pointer-events:none). */}
        <div className="flex items-center">
          <Link
            href="/"
            onClick={onBrandClick}
            className="font-display text-3xl font-bold tracking-tight text-ink sm:text-3xl md:text-[2.75rem]"
          >
            {BRAND_NAME}
          </Link>
        </div>

        {/* center: search (tablet + desktop) — width + opacity collapse on
            scroll-down. On tablet a search icon then takes the bar's place, in
            the same centred spot; desktop surfaces that icon in the right-hand
            cluster instead (so it never fights the nav for the centre). */}
        <div
          ref={searchWrapRef}
          onBlur={onSearchBlur}
          className="mx-auto hidden w-full min-w-0 items-center justify-center md:flex"
        >
          <div
            className={cn(
              "w-full min-w-0 transition-all duration-200 ease-out",
              // Clip only while collapsing (width animates to 0); when expanded we
              // must NOT clip, or the absolute suggestions dropdown gets hidden.
              searchHidden ? "max-w-0 overflow-hidden opacity-0" : "max-w-sm opacity-100 lg:max-w-md",
            )}
          >
            <SmartSearch className="w-full" />
          </div>
          {/* tablet-only: stands in for the collapsed bar, same centred spot */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={revealSearch}
            className={cn("hidden size-10 md:size-12", searchHidden && "md:inline-flex lg:hidden")}
          >
            <Search className="size-6 md:size-7" />
          </Button>
        </div>

        {/* right: wishlist (all sizes) + cart (desktop) + hamburger (mobile).
            On mobile the order reads Wishlist -> Hamburger; search lives in the
            drawer, so there's no standalone search icon. */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2 xl:gap-4">
          {/* Search — phones only (below md), sits to the LEFT of the wishlist;
              toggles the full-width search bar below the top row. On tablet the
              search is dropped and this slot shows the cart instead (below). */}
          <Button
            variant="ghost"
            size="icon"
            className="size-10 md:hidden"
            aria-label={mobileSearch ? "Close search" : "Search"}
            aria-expanded={mobileSearch}
            onClick={() => setMobileSearch((v) => !v)}
          >
            {mobileSearch ? <X className="size-6" /> : <Search className="size-6" />}
          </Button>
          {/* Cart — tablet only (md–lg): fills the search icon's slot (phones
              reach the cart via the fixed bottom bar; desktop has its own cart
              in the icon cluster below). */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="Cart"
            className="relative hidden size-10 md:inline-flex md:size-12 lg:hidden"
          >
            <Link href="/cart">
              <ShoppingCart className="size-6 md:size-7" />
              <CartBadge className="absolute -right-0.5 -top-0.5 size-4" />
            </Link>
          </Button>
          {/* Wishlist + Sign in + Cart. These stay pinned to the right in BOTH
              states — so on scroll-down, once the brand row condenses and the nav
              rises into it, the icons remain beside the nav: brand (left), nav
              (centred), icons (right). Only the search collapses away. */}
          <div className="flex items-center gap-1 xl:gap-4">
            {/* Search — desktop only, shown when collapsed (the centre search bar
                is hidden then). Tablet shows its own icon in the bar's centred
                spot above. Clicking scrolls to the top to reveal + focus the bar. */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={revealSearch}
              className={cn("hidden", searchHidden && "lg:inline-flex")}
            >
              <Search className="size-6" />
            </Button>
            {/* Wishlist — visible on all sizes (mobile reaches Cart via the
                bottom bar, so the header surfaces Wishlist instead). */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Wishlist"
              className="size-10 md:size-12 lg:size-8"
            >
              <Link href="/wishlist" className="relative">
                <Heart className="size-6 md:size-7 lg:size-6" />
                <WishlistBadge className="absolute -right-0.5 -top-0.5 size-4" />
              </Link>
            </Button>
            {/* Account / Sign in — desktop only. */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={isLoggedIn ? "Account" : "Sign in"}
              className="relative hidden lg:inline-flex"
            >
              <Link href={isLoggedIn ? "/account" : "/signin"} className="flex items-center gap-2">
                <User className="size-6" />
              </Link>
            </Button>
            {/* Cart — desktop only (mobile uses the fixed bottom bar). */}
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Cart"
              className="relative hidden lg:inline-flex"
            >
              <Link href="/cart">
                <ShoppingCart className="size-6" />
                <CartBadge className="absolute -right-0.5 -top-0.5 size-4" />
              </Link>
            </Button>
          </div>
          {/* Hamburger — mobile only, sits after the wishlist on the right. */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-10 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <SheetHeader className="border-b border-cream-300">
                <SheetTitle className="font-display text-xl text-ink">
                  {BRAND_NAME}
                </SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto px-4 pb-8 pt-3">
                {/* One uniform list. By Age / By Category expand in place; the
                    rest are direct links — all share the same top-level style. */}
                <nav className="flex flex-col">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="age" className="border-none">
                      <AccordionTrigger className={drawerItemClass}>
                        By Age
                      </AccordionTrigger>
                      <AccordionContent className="pb-1 [&_a]:no-underline">
                        <DrawerList links={ageNav} onNavigate={close} pathname={pathname} />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="category" className="border-none">
                      <AccordionTrigger className={drawerItemClass}>
                        By Category
                      </AccordionTrigger>
                      <AccordionContent className="pb-1 [&_a]:no-underline">
                        <DrawerList links={categoryNav} onNavigate={close} pathname={pathname} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {mainNav.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={(e) => navClick(e, l.href, pathname, close)}
                      className={drawerItemClass}
                    >
                      {l.labelBn}
                    </Link>
                  ))}
                  <Link
                    href={isLoggedIn ? "/account" : "/signin"}
                    onClick={(e) =>
                      navClick(e, isLoggedIn ? "/account" : "/signin", pathname, close)
                    }
                    className={drawerItemClass}
                  >
                    {isLoggedIn ? "Account" : "Sign In"}
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* mobile: full-width search bar, revealed by the header search icon */}
      {mobileSearch ? (
        <div className={cn(headerContainerClass, "pb-2 md:hidden")}>
          <SmartSearch className="w-full" autoFocus />
        </div>
      ) : null}

      {/* desktop nav — sits below the brand row while expanded. On collapse it
          RISES with an animating negative margin-top until it's vertically
          centred inside the condensed brand row, so the menu glides up smoothly
          instead of snapping between rows. It also shrinks to its content width
          (md:w-fit md:mx-auto) so its box spans only the centred items and never
          overlaps / blocks the brand link on the left. The items stay centred on
          the header either way, so that width swap is visually silent. */}
      <nav
        className={cn(
          "hidden transition-[margin-top] duration-200 ease-out lg:block",
          // -mt lifts the nav up into the brand row's band as the search + icons
          // fade (~3.25rem ≈ vertically centred against the brand). This "rise
          // onto the brand row" only happens at xl+, where there's room for
          // brand | nav | icons on one line. From lg to xl the nav stays on its
          // own centred row below the brand, so it never overlaps the icons.
          collapsed ? "xl:-mt-[3.25rem] xl:w-fit xl:mx-auto" : "xl:mt-0",
        )}
      >
        <div
          data-collapsed={collapsed ? "true" : "false"}
          className={cn(
            "group/navrow flex items-center justify-center transition-all duration-200 ease-out",
            // Stays centered in both states (no justify-start), so when the gaps
            // tighten on collapse the row contracts toward its own centre —
            // pulling in evenly from BOTH sides rather than only the right.
            collapsed
              ? "gap-0.5 py-2 md:gap-0.5 lg:gap-0.5 xl:gap-1"
              : "gap-2 py-4 lg:gap-2 xl:gap-4",
          )}
        >
          <NavItem
            href="/"
            label="Home"
            active={isActivePath(pathname, "/")}
            pathname={pathname}
          />
          <NavItem
            href="/collections/all"
            label="All Products"
            active={isActivePath(pathname, "/collections/all")}
            pathname={pathname}
          />
          <AgeMega pathname={pathname} />
          <CategoryMega pathname={pathname} />
          {mainNav.slice(2).map((l) => (
            <NavItem
              key={l.href}
              href={l.href}
              label={l.labelBn}
              active={isActivePath(pathname, l.href)}
              pathname={pathname}
            />
          ))}
        </div>
      </nav>
      </div>
    </header>
  );
}
