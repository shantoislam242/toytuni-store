import "server-only";
import { getFullCatalog } from "@/lib/data/full-catalog";
import { CatalogProvider } from "./catalog-context";

/**
 * Server hydrator for the client {@link CatalogProvider}. Reads the full
 * catalogue from the DB — `getFullCatalog` returns every active product, shelf
 * products AND gift kits / gift cards (they are seeded as normal products with
 * a nulled category), so the client cart can resolve gift slugs too — and hands
 * it down as a plain-serialisable prop.
 *
 * Mounted in the root layout ABOVE `CartProvider`, since the cart resolves its
 * line items through the catalogue. Fail-soft: `getFullCatalog` already falls
 * back to the mock catalogue on any DB error, so this never blocks a render.
 */
export async function CatalogProviderServer({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalog = await getFullCatalog();
  return <CatalogProvider catalog={catalog}>{children}</CatalogProvider>;
}
