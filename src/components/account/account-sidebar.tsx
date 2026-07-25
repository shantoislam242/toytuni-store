"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  LayoutGrid, Package, Bell, MessageSquare, Heart, UserRound, SlidersHorizontal,
  MapPin, ShieldCheck, LogOut, LayoutDashboard, Star, type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useWishlist } from "@/lib/wishlist/wishlist-context";
import { TIER_META } from "@/lib/account/loyalty";
import type { CustomerTier } from "@/lib/admin/customer-tier";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Not yet built — rendered disabled with a "Soon" tag. */
  soon?: boolean;
  /** Live count badge (orders, wishlist). */
  badge?: "orders" | "wishlist";
};

/** Live nav for Phase 1: Overview + My Orders + Wishlist (existing top-level
 *  page). The rest land in later phases — shown disabled so the shell matches
 *  the final layout. */
const DASHBOARD: NavItem[] = [
  { label: "Overview", href: "/account", icon: LayoutGrid },
  { label: "My Orders", href: "/account/orders", icon: Package, badge: "orders" },
  { label: "Notifications", href: "/account/notifications", icon: Bell, soon: true },
  { label: "Inbox", href: "/account/inbox", icon: MessageSquare, soon: true },
  { label: "Wishlist", href: "/wishlist", icon: Heart, badge: "wishlist" },
];
const SETTINGS: NavItem[] = [
  { label: "Profile", href: "/account/profile", icon: UserRound, soon: true },
  { label: "Preferences", href: "/account/preferences", icon: SlidersHorizontal, soon: true },
  { label: "Addresses", href: "/account/addresses", icon: MapPin, soon: true },
  { label: "Security", href: "/account/security", icon: ShieldCheck, soon: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/account") return pathname === "/account";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountSidebar({
  user, tier, points, orderCount, showAdminLink,
}: {
  user: { name: string; email: string };
  tier: CustomerTier;
  points: number;
  orderCount: number;
  showAdminLink: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();
  const { count: wishlistCount } = useWishlist();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to sign out.");
      setSigningOut(false);
    }
  };

  const badgeValue = (b?: NavItem["badge"]) =>
    b === "orders" ? orderCount : b === "wishlist" ? wishlistCount : 0;

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const value = badgeValue(item.badge);
    if (item.soon) {
      return (
        <div key={item.href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-soft/70">
          <Icon className="size-4" />
          <span className="flex-1">{item.label}</span>
          <span className="rounded-full bg-cream-200 px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">Soon</span>
        </div>
      );
    }
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-neem text-paper" : "text-ink-muted hover:bg-cream-100 hover:text-ink",
        )}
      >
        <Icon className="size-4" />
        <span className="flex-1">{item.label}</span>
        {value > 0 && (
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            active ? "bg-paper/20 text-paper" : "bg-neem/15 text-neem-deep",
          )}>
            {value}
          </span>
        )}
      </Link>
    );
  };

  const meta = TIER_META[tier];

  return (
    <aside className="rounded-2xl border border-cream-300 bg-card p-4 lg:sticky lg:top-[110px]">
      {/* profile card */}
      <div className="flex items-center gap-3 border-b border-cream-200 pb-4">
        <span className="flex size-12 flex-none items-center justify-center rounded-full bg-neem/10 text-lg font-bold text-neem-deep">
          {(user.name || user.email).charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
          <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", meta.badge)}>
            <Star className="size-3" /> {meta.label} · {points.toLocaleString("en-US")} pts
          </span>
        </div>
      </div>

      <nav className="mt-4 space-y-1">
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Dashboard</p>
        {DASHBOARD.map(renderItem)}
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Settings</p>
        {SETTINGS.map(renderItem)}
      </nav>

      <div className="mt-4 space-y-2 border-t border-cream-200 pt-4">
        {showAdminLink && (
          <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neem-deep hover:bg-cream-100">
            <LayoutDashboard className="size-4" /> Admin Dashboard
          </Link>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <LogOut className="size-4" /> {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
