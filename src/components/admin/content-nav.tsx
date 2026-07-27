"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Homepage", href: "/admin/content", exact: true },
  { label: "About page", href: "/admin/content/about" },
  { label: "Bulk page", href: "/admin/content/bulk" },
  { label: "Loyalty page", href: "/admin/content/loyalty" },
  { label: "Pop-up", href: "/admin/content/popup" },
  { label: "Policies", href: "/admin/content/policies" },
  { label: "Navigation", href: "/admin/content/navigation" },
];

/** Sub-navigation for the admin Content area (Homepage / About / …). */
export function ContentNav() {
  const pathname = usePathname();
  return (
    <div className="mt-4 flex flex-wrap gap-1 border-b border-cream-200">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-neem text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
