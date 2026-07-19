"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  Users,
  Warehouse,
  Newspaper,
  Settings,
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

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

// Live sections: Dashboard, Products, Categories, Orders, Inventory. Everything
// else is on the roadmap and shown disabled with a "Soon" tag so the eventual
// nav shape is visible without shipping half-built pages.
const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Package },
  { label: "Categories", href: "/admin/categories", icon: Tags },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Customers", href: "/admin/customers", icon: Users, disabled: true },
  { label: "Inventory", href: "/admin/inventory", icon: Warehouse },
  { label: "Blog", href: "/admin/blog", icon: Newspaper, disabled: true },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

/** True iff `pathname` is `href` exactly, or a child route of it — except for
 *  `/admin` itself, which must match exactly (every admin route starts with
 *  `/admin`, so a prefix match would light up "Dashboard" everywhere). */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();

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
              {NAV_ITEMS.map((item) => {
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
