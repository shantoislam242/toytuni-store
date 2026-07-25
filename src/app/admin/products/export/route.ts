import { getIsAdmin } from "@/lib/auth/session";
import { getAdminProducts } from "@/lib/admin/queries";
import { toCsv, csvResponse } from "@/lib/admin/csv";

export const dynamic = "force-dynamic";

/**
 * `GET /admin/products/export` — download the full catalog (active + inactive)
 * as CSV. Admin-gated + service-role.
 */
export async function GET() {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });

  const products = await getAdminProducts();
  const csv = toCsv(
    ["SKU", "Title", "Slug", "Price", "Compare-at", "Active", "Stock", "Low-stock threshold", "Created"],
    products.map((p) => [
      p.sku,
      p.title,
      p.slug,
      p.price,
      p.compareAtPrice,
      p.active ? "yes" : "no",
      p.stockQty,
      p.lowStockThreshold,
      p.createdAt.slice(0, 10),
    ]),
  );
  return csvResponse(csv, `products-${new Date().toISOString().slice(0, 10)}.csv`);
}
