import { getIsAdmin } from "@/lib/auth/session";
import { getAdminOrders } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

/**
 * `GET /admin/orders/export` — download all orders as CSV. Admin-gated
 * (re-checked here, not just via the layout/proxy) and service-role, matching
 * the admin orders list.
 */
export async function GET() {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });

  const orders = await getAdminOrders();
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
  return csvResponse(csv, `orders-${new Date().toISOString().slice(0, 10)}.csv`);
}
