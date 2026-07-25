import type { Metadata } from "next";
import { getAdminCustomers } from "@/lib/admin/queries";
import { CustomersTable } from "@/components/admin/customers-table";
import { ExportCsvLink } from "@/components/admin/export-csv-link";

export const metadata: Metadata = { title: "Customers", robots: { index: false, follow: false } };

export default async function Page() {
  const customers = await getAdminCustomers();
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Customers</h1>
          <p className="mt-1 text-sm text-ink-muted">Buyers, their orders, and spend. Most recently active first.</p>
        </div>
        {customers.length > 0 ? <ExportCsvLink href="/admin/customers/export" /> : null}
      </div>
      <div className="mt-6"><CustomersTable items={customers} /></div>
    </div>
  );
}
