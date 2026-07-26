import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, Plus } from "lucide-react";
import { getAdminOrders } from "@/lib/admin/queries";
import { OrdersTable } from "@/components/admin/orders-table";
import { Button } from "@/components/ui/button";

export function generateMetadata(): Metadata {
  return {
    title: "Orders",
    robots: { index: false, follow: false },
  };
}

/**
 * Orders list (Task 6). `getAdminOrders()` is service-role, unscoped by RLS —
 * server-only. The table itself is a client component for instant search.
 */
export default async function Page() {
  const orders = await getAdminOrders();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-neem-deep">
            Sales
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink">Orders</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/admin/orders/create">
              <Plus className="size-4" /> New order
            </Link>
          </Button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-cream-300 px-6 py-14 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream-200 text-neem-deep">
            <ShoppingCart className="size-6" />
          </span>
          <p className="mt-4 font-medium text-ink">No orders yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Orders placed at checkout will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <OrdersTable orders={orders} />
        </div>
      )}
    </div>
  );
}
