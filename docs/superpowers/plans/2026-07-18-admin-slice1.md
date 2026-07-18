# Phase 3 Admin Slice 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** A branded admin panel (Storify shell, toytuni theme) to edit existing products (incl. image), view/update orders, and see a KPI dashboard — replacing Supabase Studio for day-to-day ops.

**Architecture:** shadcn Sidebar shell gated by a server-side `getIsAdmin()` re-check; server-only admin queries + server actions (service-role, each re-checks admin, revalidates). Overlay model unchanged; a new `products.image_url` lets admin-uploaded images (Supabase Storage) show on the storefront.

**Tech Stack:** Next.js 16, TypeScript, Supabase (service-role for admin), shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-18-admin-slice1-design.md`

## Global Constraints
- **Non-standard Next.js.** Before writing server actions / `revalidatePath`/`revalidateTag` / layout redirects, READ `node_modules/next/dist/docs/`. Middleware is `src/proxy.ts` (already gates `/admin`), NOT `middleware.ts`.
- **Auth defense-in-depth:** the admin layout AND every write server action re-check `getIsAdmin()` (`src/lib/auth/session.ts`) server-side. The proxy is not the only guard.
- **Service-role is server-only** — never in a client bundle. Admin queries/actions are server-only.
- **Theme:** toytuni tokens (neem/cream/ink, `font-display`) — NOT Storify's colors. Follow existing `src/components/ui` + `globals.css` styling.
- **Money** via `formatTk`, **dates** via `formatDate`. BDT integers.
- Slice-1 product edit = OPERATIONAL fields only (price, compare_at, stock, low_stock_threshold, preorder_ship_date, active, badge, image) — these reflect on the storefront. Structural fields (title/category/age-tier/description) are read-only this slice.
- `.env.local`/`.superpowers/` gitignored — stage explicit paths only.

## Manual step (user, like prior migrations)
Apply `supabase/migrations/0004_products_image_url.sql` (`alter table products add column image_url text;`) in the Supabase SQL editor. Image features verify live only after this.

---

## Task 1: shadcn Sidebar + admin shell + server-side admin re-check
**Files:** Create `src/components/ui/sidebar.tsx` (shadcn sidebar), `src/app/admin/layout.tsx`, `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`. Modify `src/app/admin/page.tsx` (temporary "Dashboard soon" inside the shell).
**Interfaces:** `admin/layout.tsx` (server) redirects non-admins; renders `<AdminShell user>` wrapping `{children}`. Sidebar nav: Dashboard (`/admin`), Products (`/admin/products`), Orders (`/admin/orders`) active; Customers/Inventory/Blog/Settings shown disabled ("Soon").
- [ ] Step 1 — Add shadcn sidebar: `npx shadcn@latest add sidebar` (or hand-add the component + its CSS vars into `globals.css`); confirm it uses toytuni tokens (adapt the sidebar CSS vars to neem/cream).
- [ ] Step 2 — `admin/layout.tsx` (server): `const user = await getSessionUser(); if (!user || !(await getIsAdmin())) redirect("/");` then render `<AdminShell user={{name,email}}>{children}</AdminShell>`. READ the Next docs for `redirect` in a layout first.
- [ ] Step 3 — `admin-shell.tsx` (client): `SidebarProvider` + `<AdminSidebar/>` + `SidebarInset` with a header (admin email, sign-out via `useAuth().signOut()`, "View store" link) + `{children}`.
- [ ] Step 4 — `admin-sidebar.tsx` (client): nav items w/ lucide icons + active state via `usePathname()`; disabled "Soon" items.
- [ ] Step 5 — Verify: `npm run build` ok; the shell renders (controller live-checks with an admin session). Commit `feat(admin): sidebar shell + server-side admin re-check`.

## Task 2: `products.image_url` migration + overlay plumbing
**Files:** Create `supabase/migrations/0004_products_image_url.sql`. Modify `src/lib/data/product-overlay.ts` (+ its test), `src/lib/data/products.ts` (getProductOverrides selects `image_url`), `src/components/product/product-image.tsx`.
**Interfaces:** `ProductOverride` gains `imageUrl: string | null`; `applyOverride` sets `product.imageUrl`; `ProductImage` uses `imageUrl` when present, else the existing public-path probing.
- [ ] Step 1 — Write `0004_products_image_url.sql`. (Applied manually by the user; the code below tolerates the column being absent by defaulting null.)
- [ ] Step 2 — TDD `applyOverride`: extend the test so an override with `imageUrl` sets `product.imageUrl`, and without leaves it undefined. RED → implement → GREEN.
- [ ] Step 3 — `getProductOverrides`: add `image_url` to the select; map to `imageUrl`.
- [ ] Step 4 — `ProductImage`: accept an optional `imageUrl` (or read `product.imageUrl`); if a full URL is set, render it directly; else keep the current `public/images/products/<slug>` probing. Add the Supabase Storage hostname to `next.config` image `remotePatterns` so `next/image` allows it.
- [ ] Step 5 — Verify tsc/eslint/build + `npm test`. Commit `feat(admin): products.image_url column + overlay/image plumbing`.

## Task 3: Admin queries (server-only) + dashboard-stats TDD
**Files:** Create `src/lib/admin/queries.ts`, `src/lib/admin/stats.ts` (pure agg), `src/lib/admin/stats.test.ts`.
**Interfaces:** `stats.ts`: `computeDashboardStats(orders, products, inventory): { orderCount, revenue, pendingCount, lowStockCount }` (pure). `queries.ts` (`server-only`, service-role): `getDashboardStats()`, `getAdminProducts()`, `getAdminProductBySlug(slug)`, `getAdminOrders()`, `getAdminOrderById(id)` — read ALL rows (incl. inactive), joined as needed.
- [ ] Step 1 — TDD `computeDashboardStats` (fixture: orders w/ totals + statuses, inventory w/ stock vs threshold). RED → implement → GREEN.
- [ ] Step 2 — `queries.ts`: implement the five reads with the service-role admin client (`.overrideTypes()` if the `never` quirk appears). `getDashboardStats` = fetch + `computeDashboardStats`.
- [ ] Step 3 — Verify tsc/eslint/build + tests. Commit `feat(admin): server-only admin queries + dashboard stats`.

## Task 4: Dashboard page
**Files:** Modify `src/app/admin/page.tsx`.
- [ ] Step 1 — Server component: `await getDashboardStats()` → render KPI cards (orders, revenue via `formatTk`, pending, low-stock) using the existing `Card` component, toytuni-themed.
- [ ] Step 2 — Verify build + controller live-check (admin session sees numbers). Commit `feat(admin): dashboard KPIs`.

## Task 5: Products list + edit + write actions
**Files:** Create `src/lib/admin/actions.ts` (`"use server"`), `src/app/admin/products/page.tsx`, `src/app/admin/products/[slug]/page.tsx`, `src/components/admin/product-edit-form.tsx` (client), `src/components/admin/products-table.tsx` (client, search).
**Interfaces:** `actions.ts`: `updateProduct(slug, patch)` (price/compare_at/stock/low_stock/preorder_ship_date/active/badge), `uploadProductImage(slug, formData)` → Storage + set `image_url`. Each: `if (!(await getIsAdmin())) throw new Error("unauthorized")`, service-role write, then `revalidateTag("products")` + `revalidatePath("/admin/products")` + the product path.
- [ ] Step 1 — READ Next docs for `"use server"` actions, `revalidateTag`, file/`FormData` handling.
- [ ] Step 2 — `actions.ts`: implement `updateProduct` (writes products + inventory) and `uploadProductImage` (validate image type/size, upload to `product-images/<slug>/<filename>`, get public URL, set `products.image_url`). Both re-check admin.
- [ ] Step 3 — `products-table.tsx` (client): rows (thumb, title, sku, price, stock, active badge, edit link) + a client-side search box over the passed list.
- [ ] Step 4 — `products/page.tsx` (server): `getAdminProducts()` → `<ProductsTable products=…/>`.
- [ ] Step 5 — `product-edit-form.tsx` (client): operational fields + image picker; on submit calls the server actions; shows success/error toast. Structural fields shown read-only.
- [ ] Step 6 — `products/[slug]/page.tsx` (server): `getAdminProductBySlug` → `<ProductEditForm product=…/>`.
- [ ] Step 7 — Verify: build; controller live — edit a product's price+stock → persists + shows on storefront; upload an image → lands in Storage + renders; non-admin action call rejected. Commit `feat(admin): product list, edit, image upload`.

## Task 6: Orders list + detail + status update
**Files:** Add `updateOrderStatus` to `actions.ts`; create `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx`, `src/components/admin/orders-table.tsx` (client), `src/components/admin/order-status-select.tsx` (client).
**Interfaces:** `updateOrderStatus(orderId, status)` — validate status ∈ {pending,confirmed,shipped,delivered,cancelled}, re-check admin, service-role update, revalidate the orders paths.
- [ ] Step 1 — `orders-table.tsx` (client): order number, date, customer name/phone, total, status badge, detail link.
- [ ] Step 2 — `orders/page.tsx` (server): `getAdminOrders()` → table.
- [ ] Step 3 — `orders/[id]/page.tsx` (server): `getAdminOrderById` → items (title, qty, unit_price, line_total, fulfillment), address, customer, total; `<OrderStatusSelect current=… orderId=…/>`.
- [ ] Step 4 — `order-status-select.tsx` (client): dropdown → `updateOrderStatus`; toast.
- [ ] Step 5 — Verify: build; controller live — an order's status change persists; non-admin rejected. Commit `feat(admin): orders list, detail, status update`.

## Self-Review Notes
- Every spec goal maps to a task: shell+auth (T1), image plumbing (T2), queries+stats (T3), dashboard (T4), products edit+image (T5), orders+status (T6).
- 0004 migration is user-applied; image features verify live only after. Flagged in T2/T5.
- Slice-1 product edit is operational-fields-only (storefront reflects these); structural edits deferred to the catalog-in-DB slice — avoids "edited but not shown".
- Add-new/delete product intentionally absent (Slice 2).
