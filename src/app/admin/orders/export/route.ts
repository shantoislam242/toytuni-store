import { getIsAdmin } from "@/lib/auth/session";
import { getAdminOrders } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

/**
 * `GET /admin/orders/export[?days=N]` — download orders as CSV. Admin-gated
 * (re-checked here, not just via the layout/proxy) and service-role. `days`
 * (e.g. 15/30) limits the export to orders from the last N days; omitted =
 * all orders. Matches the orders list's date-range filter.
 */
export async function GET(request: Request) {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });

  const daysRaw = new URL(request.url).searchParams.get("days");
  const days = daysRaw && /^\d+$/.test(daysRaw) ? Number(daysRaw) : 0;

  let orders = await getAdminOrders();
  let rangeLabel = "all";
  if (days > 0) {
    const cutoff = Date.now() - days * 86_400_000;
    orders = orders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    rangeLabel = `last-${days}d`;
  }

  const csv = toCsv(
    ["Order", "Date", "Customer", "Phone", "Total", "Status", "Payment method", "Payment status", "Carrier", "Tracking"],
    orders.map((o) => [
      o.orderNumber,
      o.createdAt.slice(0, 10),
      o.customerName,
      o.customerPhone,
      o.total,
      o.status,
      o.paymentMethod,
      o.paymentStatus,
      o.carrier,
      o.trackingNumber,
    ]),
  );
  return csvResponse(csv, `orders-${rangeLabel}-${new Date().toISOString().slice(0, 10)}.csv`);
}
