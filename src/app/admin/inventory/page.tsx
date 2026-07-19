import type { Metadata } from "next";
import { getAdminInventory } from "@/lib/admin/queries";
import { InventoryTable } from "@/components/admin/inventory-table";

export const metadata: Metadata = { title: "Inventory", robots: { index: false, follow: false } };

export default async function Page() {
  const items = await getAdminInventory();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-ink">Inventory</h1>
      <p className="mt-1 text-sm text-ink-muted">Set or adjust stock and low-stock thresholds. Low stock shows first.</p>
      <div className="mt-6">
        <InventoryTable items={items} />
      </div>
    </div>
  );
}
