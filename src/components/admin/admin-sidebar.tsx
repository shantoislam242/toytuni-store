"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Inbox,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  Newspaper,
  Settings,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { BRAND_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import type { AdminRole } from "@/lib/auth/resolve-role";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

// All sections are live (Task 5 shipped Blog, the last one gated with
// `disabled: true` + a "Soon" tag). The disabled-item rendering below stays in
// place for any future roadmap section added ahead of its page shipping.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Inbox", href: "/admin/inbox", icon: Inbox },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Blog", href: "/admin/blog", icon: Newspaper },
  { label: "Reviews", href: "/admin/reviews", icon: Star },
  { label: "Team", href: "/admin/team", icon: ShieldCheck },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/** Nav items visible only to a `super_admin` — filtered at render (not a
 *  separate NAV_ITEMS definition) so there's a single source of truth for
 *  the nav list. */
const SUPER_ADMIN_ONLY_HREFS = new Set(["/admin/team", "/admin/settings"]);

/** True iff `pathname` is `href` exactly, or a child route of it — except for
 *  `/admin` itself, which must match exactly (every admin route starts with
 *  `/admin`, so a prefix match would light up "Dashboard" everywhere). */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  inboxUnread,
  role,
}: {
  inboxUnread?: number;
  role?: AdminRole;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter(
    (item) => !SUPER_ADMIN_ONLY_HREFS.has(item.href) || role === "super_admin",
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-3">
        <Link
          href="/admin"
          className="flex items-center px-1 font-display text-xl font-bold text-ink group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:text-base"
        >
          {BRAND_NAME}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;

                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.label} — Soon`}
                        className="cursor-not-allowed opacity-50"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      <SidebarMenuBadge className="pointer-events-none">
                        Soon
                      </SidebarMenuBadge>
                    </SidebarMenuItem>
                  );
                }

                const active = isActive(pathname, item.href);
                const showInboxBadge = item.href === "/admin/inbox" && (inboxUnread ?? 0) > 0;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={cn(
                        active && "font-medium",
                      )}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                    {showInboxBadge && (
                      <SidebarMenuBadge className="rounded-full bg-neem px-1.5 text-[10px] font-semibold text-paper">
                        {inboxUnread}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
