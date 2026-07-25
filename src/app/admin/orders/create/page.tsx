import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminProducts } from "@/lib/admin/queries";
import { ManualOrderForm } from "@/components/admin/manual-order-form";

export function generateMetadata(): Metadata {
  return { title: "New order", robots: { index: false, follow: false } };
}

/**
 * `/admin/orders/create` — place an order for a customer (phone/in-store). The
 * catalog (active products only) is passed to the client form for the product
 * picker; placement re-validates everything via `createManualOrder`.
 */
export default async function Page() {
  const products = (await getAdminProducts())
    .filter((p) => p.active)
    .map((p) => ({ slug: p.slug, title: p.title, sku: p.sku, price: p.price, stockQty: p.stockQty }));

  return (
    <div>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to orders
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink">New order</h1>
      <p className="mt-1 text-sm text-ink-muted">Place an order on a customer&apos;s behalf.</p>
      <div className="mt-6">
        <ManualOrderForm products={products} />
      </div>
    </div>
  );
}
