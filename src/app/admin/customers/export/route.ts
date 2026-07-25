import { getIsAdmin } from "@/lib/auth/session";
import { getAdminCustomers } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

/**
 * `GET /admin/customers/export` — download the customer list (with per-customer
 * metrics + tier) as CSV. Admin-gated + service-role.
 */
export async function GET() {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });

  const customers = await getAdminCustomers();
  const csv = toCsv(
    ["Name", "Phone", "Email", "Status", "Tier", "Orders", "Total spent", "AOV", "Cancelled", "First order", "Last order", "Tags"],
    customers.map((c) => [
      c.name,
      c.phone,
      c.email,
      c.status,
      c.tier,
      c.orderCount,
      c.totalSpent,
      c.aov,
      c.cancelledCount,
      c.firstOrderAt ? c.firstOrderAt.slice(0, 10) : "",
      c.lastOrderAt ? c.lastOrderAt.slice(0, 10) : "",
      c.tags.join("; "),
    ]),
  );
  return csvResponse(csv, `customers-${new Date().toISOString().slice(0, 10)}.csv`);
}
