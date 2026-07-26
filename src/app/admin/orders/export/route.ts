import { getIsAdmin } from "@/lib/auth/session";
import { getAdminOrders } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

const isYmd = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/**
 * `GET /admin/orders/export[?days=N | ?from=YYYY-MM-DD&to=YYYY-MM-DD]` —
 * download orders as CSV. Admin-gated (re-checked here, not just via the
 * layout/proxy) and service-role. `days` (e.g. 15/30) limits the export to
 * orders from the last N days; `from`/`to` give an inclusive custom range
 * (either side may be omitted). No params = all orders. Matches the orders
 * list's date-range filter.
 */
export async function GET(request: Request) {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  const daysRaw = params.get("days");
  const days = daysRaw && /^\d+$/.test(daysRaw) ? Number(daysRaw) : 0;

  let orders = await getAdminOrders();
  let rangeLabel = "all";
  if (isYmd(from) || isYmd(to)) {
    const fromT = isYmd(from) ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const toT = isYmd(to) ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    orders = orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= fromT && t <= toT;
    });
    rangeLabel = `${isYmd(from) ? from : "start"}_to_${isYmd(to) ? to : "now"}`;
  } else if (days > 0) {
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
