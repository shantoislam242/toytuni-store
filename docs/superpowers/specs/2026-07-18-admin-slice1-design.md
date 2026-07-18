# toytuni-store — Phase 3 (Admin UI) Slice 1: Shell + Products edit + Orders + Dashboard

**Date:** 2026-07-18
**Status:** Design approved, pending spec review
**Scope:** First slice of Phase 3. The admin shell + the operational core (Dashboard, edit existing Products incl. images, Orders). "Add new product" and the other sections are later slices.

## Background

Phase 1 (Supabase data layer, overlay model) and Phase 2 (auth, admin allowlist gate) are merged and live. `/admin/*` is gated by `src/proxy.ts` + `isAdmin(ADMIN_EMAILS)`; today `/admin` is a placeholder. The `products`/`inventory`/`orders`/`order_items` tables are seeded and drive the storefront (read overlay). Editing today happens only in Supabase Studio. This slice replaces that with a branded admin panel — structured like the Storify-app admin (`C:\Databrandix HQ\ecommerce-platform\Storify-app`, reference only), themed to toytuni.

## Goals

- **Admin shell:** a shadcn `Sidebar` + admin header + content inset (Storify's shell pattern), in toytuni's theme (neem/cream/ink, font-display). Sidebar nav: Dashboard, Products, Orders (this slice) + visibly-disabled "soon" items for Customers/Inventory/Blog/Settings.
- **Defense-in-depth auth:** the admin layout re-checks `getIsAdmin()` server-side (not only the proxy) and redirects non-admins.
- **Dashboard (`/admin`):** KPI cards — total orders, total revenue, pending orders, low-stock product count.
- **Products:** a searchable data-table list; an edit page for an existing product that writes price, compare-at, stock, low-stock threshold, pre-order date, active, badge, title, description, category, age-tier — and **uploads/replaces the product image to Supabase Storage**.
- **Orders:** a data-table list; a detail page showing items + address + customer, with a **status update** (pending → confirmed → shipped → delivered → cancelled).
- All writes are **server actions**, each re-checking admin, using the service-role client.

## Non-goals (this slice)

- **No "add new product" / delete product** — needs the catalog-in-DB refactor (client cart/search hydration); that is Slice 2.
- No Customers / Inventory-as-its-own-page / Blog / Settings pages (later slices; sidebar shows them disabled).
- No Storefront read changes — the overlay stays; admin edits to existing products flow to the storefront via the existing overlay + ISR/dynamic reads.

## Locked decisions

- **Structure:** Storify admin shell pattern (`SidebarProvider` + sidebar + `SidebarInset` + header), **toytuni theme**. Add `src/components/ui/sidebar.tsx` (shadcn) — it doesn't exist yet.
- **Scope:** edit existing products (incl. image), orders view + status; dashboard KPIs. No add/delete product.
- **Images:** **Supabase Storage** (`product-images` bucket, already created). New uploads go there; the `products` row stores an `image_url`. Existing 55 images stay in `public/`; `ProductImage` resolves a stored `image_url` if present, else falls back to the current `public/images/products/<slug>/…` probing.
- **Auth:** proxy gate (Phase 2) + a server-side `getIsAdmin()` re-check in the admin layout AND in every write server action.

## Schema addition

`products` has no image URL column today (images resolve from `public/` by slug). Add one for admin-uploaded images:
- Migration `0004_products_image_url.sql`: `alter table products add column image_url text;`
`ProductImage` (storefront) prefers `image_url` when set, else the existing public-path probing — so existing products are unaffected and edited ones can point at a Storage URL.

## Architecture

- **Shell:** `src/app/admin/layout.tsx` (server) — `getSessionUser()` + `getIsAdmin()`; if not admin, `redirect("/")` (belt-and-suspenders with the proxy). Renders `<AdminShell user=…>` (client) = shadcn sidebar (nav items, active state, collapse) + header (admin name/email, sign-out, "view store" link) + `{children}`.
- **Admin data reads:** `src/lib/admin/queries.ts` (server-only, service-role) — `getDashboardStats()`, `getAdminProducts()`, `getAdminProductBySlug(slug)`, `getAdminOrders()`, `getAdminOrderById(id)`. These read ALL rows (incl. inactive) — admin sees everything, unlike the storefront's `active=true` overlay.
- **Write server actions:** `src/lib/admin/actions.ts` (`"use server"`) — `updateProduct(slug, patch)`, `updateInventory(productId, patch)` (or folded into updateProduct), `updateOrderStatus(orderId, status)`, `uploadProductImage(slug, file)`. Each starts with `if (!(await getIsAdmin())) throw` (server-side re-check), uses the service-role client, and `revalidatePath`/`revalidateTag` the affected storefront + admin pages so edits show immediately.
- **Pages:** `src/app/admin/page.tsx` (dashboard), `src/app/admin/products/page.tsx` (list) + `[slug]/page.tsx` (edit form), `src/app/admin/orders/page.tsx` (list) + `[id]/page.tsx` (detail). Server components fetch via `queries.ts`; interactive bits (forms, status dropdown, search) are client islands calling the server actions.

## Data flow — a product edit

1. Admin opens `/admin/products/neem-rattle-set` → server reads the full row (products + inventory).
2. Edits fields / picks a new image → the client form calls `updateProduct` (+ `uploadProductImage`) server actions.
3. Action re-checks admin, writes `products` + `inventory` (service-role), uploads the image to Storage and sets `image_url`, then `revalidateTag('products')` (and the product/collection paths).
4. Storefront reflects the change (price/stock via the existing overlay; image via the new `image_url`).

## Security

- Every admin read/write is server-side with the service-role key; **no service-role key or admin query ever reaches a client bundle**.
- Every write server action independently re-checks `getIsAdmin()` — the proxy is not the only guard (a server action can be invoked directly).
- Image upload validates content-type (image/*) and size before storing.

## Testing

- **Pure logic (TDD):** `getDashboardStats` aggregation (totals/pending/low-stock from a fixture), and any status-transition validation helper.
- **Integration (drive it):** admin (allowlisted session) can load the shell + each page; a product edit persists to the DB and shows on the storefront; an image upload lands in Storage and renders; an order status update persists; a NON-admin session is redirected from every `/admin/*` page and every write action rejects. (Verified controller-side with API-created sessions, as in Phase 2.)

## Open questions for review

- Product edit scope includes structural fields (title/category/age-tier) even though "add new" is deferred — editing those on existing products is safe (they're already in mock+DB; the storefront overlay uses DB price/stock but mock structure, so a title edit in DB won't show until Slice 2's catalog-in-DB). **Decision:** for Slice 1, the edit form focuses on **operational fields that the storefront actually reads from DB** (price, compare-at, stock, low-stock, pre-order date, active, badge, image_url); structural fields (title, description, category, age-tier) are shown read-only or deferred, to avoid "edited but not reflected" confusion. Revisit when catalog-in-DB lands.
