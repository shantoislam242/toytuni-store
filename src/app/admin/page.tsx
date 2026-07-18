import type { Metadata } from "next";
import { ClipboardList, Coins, Hourglass, PackageX } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatTk } from "@/lib/format";
import { getDashboardStats } from "@/lib/admin/queries";

export function generateMetadata(): Metadata {
  return {
    title: "Dashboard",
    robots: { index: false, follow: false },
  };
}

type KpiCard = {
  label: string;
  value: string;
  icon: typeof ClipboardList;
};

/**
 * Admin dashboard: KPI row sourced from `getDashboardStats()` (Task 3,
 * service-role, unscoped by RLS). No charts — just the four headline
 * numbers a store owner checks first.
 */
export default async function Page() {
  const stats = await getDashboardStats();

  const cards: KpiCard[] = [
    { label: "Total Orders", value: stats.orderCount.toLocaleString("en-US"), icon: ClipboardList },
    { label: "Revenue", value: formatTk(stats.revenue), icon: Coins },
    { label: "Pending Orders", value: stats.pendingCount.toLocaleString("en-US"), icon: Hourglass },
    { label: "Low Stock", value: stats.lowStockCount.toLocaleString("en-US"), icon: PackageX },
  ];

  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
        Overview
      </p>
      <h1 className="mt-1 font-display text-2xl font-bold text-ink">
        Dashboard
      </h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-cream-300">
            <CardHeader>
              <div className="flex items-center gap-2 text-ink-muted">
                <Icon className="size-4" />
                <span className="text-sm">{label}</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-display text-3xl font-bold text-ink">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
