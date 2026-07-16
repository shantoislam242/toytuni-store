# Backend Phase 1: Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the storefront off hardcoded mock files onto Supabase, and capture real COD orders (with pre-order support) — while keeping pages static + ISR.

**Architecture:** A single data-access layer (`src/lib/data/`) is the only code that talks to Supabase; pages call it and never import mock data. Reads use a public anon-key client guarded by Row Level Security; writes (orders, stock) happen only inside server actions using a service-role key. Product availability (in-stock / pre-order / sold-out) is derived from stock + a ship date, not a stored flag.

**Tech Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-16-backend-data-layer-design.md`

## Global Constraints

- **Next.js is non-standard here.** Per `AGENTS.md`: before writing any code that uses a Next.js API (server actions, `revalidateTag`, `revalidatePath`, `generateStaticParams`, `cache`, cookies), READ the relevant guide in `node_modules/next/dist/docs/`. Do not write Next APIs from memory.
- **Prices are BDT integers.** No floats for money. Format only via `formatTk` (`src/lib/format.ts`).
- **Brand name** comes from `BRAND_NAME` (`src/lib/config.ts`) — never hardcode "Toytuni".
- **`SITE_URL`** stays env-overridable (`NEXT_PUBLIC_SITE_URL`), default `https://toytuni-store.vercel.app`, no trailing slash.
- **RLS is mandatory** on every table before any data is loaded. `orders`/`order_items`/`customers` are never anon-readable.
- **Never trust client-sent prices.** `createOrder` re-reads every unit price from the DB server-side.
- **Do not delete `src/lib/mock/*.ts`** in this phase. The storefront swaps to the data layer, but mock files remain as the seed source and rollback net.
- **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` is server-only — never referenced in a client component or prefixed `NEXT_PUBLIC_`. `.env*` stays gitignored (already is).
- **Bengali content** in product/blog data is preserved verbatim through migration.

---

## File Structure

**Create:**
- `vitest.config.ts` — test runner config
- `.env.local` — Supabase URL + keys (gitignored; not committed)
- `.env.example` — documents required env vars (committed)
- `src/lib/supabase/client.ts` — browser/anon client factory
- `src/lib/supabase/server.ts` — server anon client (RLS-guarded reads in server components)
- `src/lib/supabase/admin.ts` — service-role client (server-only writes)
- `src/lib/supabase/database.types.ts` — generated DB types
- `supabase/migrations/0001_init.sql` — tables + RLS + atomic decrement function
- `src/lib/data/product-state.ts` — `getProductState()` pure logic
- `src/lib/data/product-state.test.ts`
- `src/lib/data/mappers.ts` — row → app-type mappers (pure)
- `src/lib/data/mappers.test.ts`
- `src/lib/data/products.ts` — `getProducts`, `getProductBySlug`, `getAllProductSlugs`
- `src/lib/data/catalog.ts` — `getCategories`, `getAgeTiers`
- `src/lib/data/blog.ts` — `getBlogPosts`, `getBlogPostBySlug`
- `src/lib/data/orders.ts` — `createOrder` server action + `computeOrderTotals` pure helper
- `src/lib/data/orders.test.ts`
- `scripts/seed.ts` — mock → DB + image upload

**Modify:**
- `package.json` — deps + `test`/`db:seed` scripts
- Storefront pages that currently import from `src/lib/mock/` (Task 7, enumerated there)
- `src/components/product/product-card.tsx` — pre-order badge (Task 8)
- `src/components/product/product-details-view.tsx` — pre-order CTA copy (Task 8)
- `src/components/checkout/checkout-view.tsx` — wire CTA to `createOrder` (Task 10)

---

## Task 1: Vitest setup

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Test: `src/lib/data/smoke.test.ts` (deleted at end of task)

**Interfaces:**
- Produces: a working `npm test` command that runs `*.test.ts` files.

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^2`
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Add the test script**

In `package.json` `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
```

- [ ] **Step 4: Write a smoke test**

`src/lib/data/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("vitest", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/data/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add Vitest runner"
```

---

## Task 2: Supabase project, env, and clients

**Files:**
- Create: `.env.local` (not committed), `.env.example` (committed)
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`
- Modify: `package.json`

**Interfaces:**
- Produces:
  - `createBrowserSupabase(): SupabaseClient` from `client.ts`
  - `createServerSupabase(): SupabaseClient` from `server.ts` (anon key, for RLS reads)
  - `createAdminSupabase(): SupabaseClient` from `admin.ts` (service-role, server-only)

- [ ] **Step 1: Provision Supabase (manual)**

Create a project at supabase.com. From Project Settings → API, copy: Project URL, `anon` public key, `service_role` secret key. This step is manual; the rest of the task assumes these three values exist.

- [ ] **Step 2: Install the SDK**

Run: `npm install @supabase/supabase-js@^2 @supabase/ssr@^0.5`
Expected: added to dependencies.

- [ ] **Step 3: Write `.env.local` (not committed) and `.env.example` (committed)**

`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```
`.env.example` (same keys, empty values, committed):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: Browser client — `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

/** Anon-key client for client components. Safe to expose — RLS is the wall. */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 5: Server anon client — `src/lib/supabase/server.ts`**

Before writing this, READ `node_modules/next/dist/docs/` for the current `cookies()` API. Then:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Anon-key client for server components / route handlers (RLS-guarded reads). */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — safe to ignore
          }
        },
      },
    },
  );
}
```

- [ ] **Step 6: Service-role client — `src/lib/supabase/admin.ts`**

```ts
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. SERVER-ONLY — bypasses RLS. Never import from a client
 * component or expose the key. Used only inside server actions for writes.
 */
export function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example src/lib/supabase/
git commit -m "feat(data): add Supabase client factories and env scaffolding"
```
(Confirm `.env.local` is NOT staged — it must stay gitignored.)

---

## Task 3: SQL schema + RLS migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: tables `products`, `product_variants`, `categories`, `age_tiers`, `inventory`, `orders`, `order_items`, `customers`, `blog_posts`, `site_settings`; SQL function `decrement_stock(p_product_id uuid, p_qty int) returns int`.

- [ ] **Step 1: Write the migration SQL**

`supabase/migrations/0001_init.sql` — full schema. Key excerpts (write all 10 tables following these patterns):
```sql
create extension if not exists "uuid-ossp";

create table categories (
  slug text primary key,
  title text not null,
  sort int not null default 0
);

create table age_tiers (
  slug text primary key,
  title text not null,
  sort int not null default 0
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  sku text not null,
  title text not null,
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price >= 0),
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  age_tier_slug text references age_tiers(slug),
  category_slug text references categories(slug),
  badge text check (badge in ('New','Best Seller','Limited')),
  description text,
  image_label text,
  image_tones text[] not null default '{}',
  preorder_ship_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  tone text not null
);

create table inventory (
  product_id uuid primary key references products(id) on delete cascade,
  stock_qty int not null default 0,
  low_stock_threshold int not null default 5
);

create table customers (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  name text not null,
  email text,
  auth_user_id uuid,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  division text not null,
  district text not null,
  area text not null,
  address_line text not null,
  landmark text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  subtotal int not null,
  delivery_fee int not null default 0,
  total int not null,
  notes text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  title text not null,
  unit_price int not null,
  qty int not null check (qty > 0),
  line_total int not null,
  fulfillment_type text not null check (fulfillment_type in ('in_stock','preorder')),
  preorder_ship_date date
);

create table blog_posts (
  slug text primary key,
  title text not null,
  excerpt text,
  body jsonb not null default '[]',
  author text,
  cover_image text,
  category text,
  read_mins int,
  date_iso date,
  featured boolean not null default false,
  published boolean not null default true
);

create table site_settings (
  key text primary key,
  value jsonb not null
);
```

- [ ] **Step 2: Add the atomic stock decrement function**

Append to the migration:
```sql
-- Atomically decrement stock; returns remaining qty, or -1 if insufficient.
create or replace function decrement_stock(p_product_id uuid, p_qty int)
returns int language plpgsql as $$
declare remaining int;
begin
  update inventory set stock_qty = stock_qty - p_qty
    where product_id = p_product_id and stock_qty >= p_qty
    returning stock_qty into remaining;
  if not found then return -1; end if;
  return remaining;
end $$;
```

- [ ] **Step 3: Add RLS policies**

Append:
```sql
alter table products enable row level security;
alter table product_variants enable row level security;
alter table categories enable row level security;
alter table age_tiers enable row level security;
alter table inventory enable row level security;
alter table blog_posts enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table customers enable row level security;
alter table site_settings enable row level security;

-- Public reads (active/published only). No anon policy on orders/order_items/
-- customers → anon cannot read them at all. Writes use the service-role key,
-- which bypasses RLS.
create policy "read active products" on products for select using (active = true);
create policy "read variants" on product_variants for select using (true);
create policy "read categories" on categories for select using (true);
create policy "read age_tiers" on age_tiers for select using (true);
create policy "read inventory" on inventory for select using (true);
create policy "read published posts" on blog_posts for select using (published = true);
create policy "read settings" on site_settings for select using (true);
```

- [ ] **Step 4: Apply the migration**

Paste the file into the Supabase SQL editor and run it (or `supabase db push` if the CLI is configured). Verify all 10 tables appear in the Table editor.

- [ ] **Step 5: Generate types**

Run (Supabase CLI): `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
Expected: a `Database` type covering the 10 tables.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0001_init.sql src/lib/supabase/database.types.ts
git commit -m "feat(data): initial Supabase schema, RLS, and atomic stock decrement"
```

---

## Task 4: `getProductState()` pure logic (TDD)

**Files:**
- Create: `src/lib/data/product-state.ts`
- Test: `src/lib/data/product-state.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ProductAvailability =
    | { state: "in_stock"; stockQty: number }
    | { state: "preorder"; shipDate: string }
    | { state: "sold_out" };
  export function getProductState(input: {
    stockQty: number;
    preorderShipDate: string | null;
    now?: Date;
  }): ProductAvailability;
  ```

- [ ] **Step 1: Write the failing test**

`src/lib/data/product-state.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { getProductState } from "@/lib/data/product-state";

const now = new Date("2026-07-16T00:00:00Z");

describe("getProductState", () => {
  it("in stock when qty > 0", () => {
    expect(getProductState({ stockQty: 3, preorderShipDate: null, now }))
      .toEqual({ state: "in_stock", stockQty: 3 });
  });
  it("pre-order when qty <= 0 and ship date is in the future", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-09-01", now }))
      .toEqual({ state: "preorder", shipDate: "2026-09-01" });
  });
  it("sold out when qty <= 0 and no ship date", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: null, now }))
      .toEqual({ state: "sold_out" });
  });
  it("sold out when the ship date has passed", () => {
    expect(getProductState({ stockQty: 0, preorderShipDate: "2026-01-01", now }))
      .toEqual({ state: "sold_out" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- product-state`
Expected: FAIL, "getProductState is not a function" / module not found.

- [ ] **Step 3: Write the implementation**

`src/lib/data/product-state.ts`:
```ts
export type ProductAvailability =
  | { state: "in_stock"; stockQty: number }
  | { state: "preorder"; shipDate: string }
  | { state: "sold_out" };

/** Derive availability from stock + an optional future ship date. */
export function getProductState(input: {
  stockQty: number;
  preorderShipDate: string | null;
  now?: Date;
}): ProductAvailability {
  const { stockQty, preorderShipDate, now = new Date() } = input;
  if (stockQty > 0) return { state: "in_stock", stockQty };
  if (preorderShipDate) {
    const ship = new Date(`${preorderShipDate}T00:00:00Z`);
    if (ship.getTime() > now.getTime())
      return { state: "preorder", shipDate: preorderShipDate };
  }
  return { state: "sold_out" };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- product-state`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/product-state.ts src/lib/data/product-state.test.ts
git commit -m "feat(data): derive product availability from stock and ship date"
```

---

## Task 5: Row → app-type mappers (TDD) + read functions

**Files:**
- Create: `src/lib/data/mappers.ts`, `src/lib/data/mappers.test.ts`
- Create: `src/lib/data/products.ts`, `src/lib/data/catalog.ts`, `src/lib/data/blog.ts`

**Interfaces:**
- Consumes: `Database` (Task 3), `createServerSupabase` (Task 2), `Product`/`Tone` from `src/lib/types.ts`.
- Produces:
  - `rowToProduct(row): Product` (pure) in `mappers.ts`
  - `getProducts(): Promise<Product[]>`, `getProductBySlug(slug): Promise<Product | null>`, `getAllProductSlugs(): Promise<string[]>` in `products.ts`
  - `getCategories()`, `getAgeTiers()` in `catalog.ts`
  - `getBlogPosts()`, `getBlogPostBySlug(slug)` in `blog.ts`

- [ ] **Step 1: Write the failing mapper test**

`src/lib/data/mappers.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rowToProduct } from "@/lib/data/mappers";

describe("rowToProduct", () => {
  it("maps a DB row to the app Product shape", () => {
    const p = rowToProduct({
      slug: "nesting-cups", sku: "NWR-0016", title: "Stacking Nesting Cups",
      price: 720, compare_at_price: null, rating: 4.8, review_count: 118,
      age_tier_slug: "6-12m", category_slug: "stacking-sorting-puzzles",
      badge: "Best Seller", image_label: "Nesting Cups",
      image_tones: ["dusty-blue", "cream"], description: null,
    } as never);
    expect(p.slug).toBe("nesting-cups");
    expect(p.price).toBe(720);
    expect(p.imageTones).toEqual(["dusty-blue", "cream"]);
    expect(p.badge).toBe("Best Seller");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- mappers`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the mapper**

`src/lib/data/mappers.ts`:
```ts
import type { Product, Tone } from "@/lib/types";

type ProductRow = {
  slug: string; sku: string; title: string; price: number;
  compare_at_price: number | null; rating: number; review_count: number;
  age_tier_slug: string; category_slug: string;
  badge: Product["badge"] | null; image_label: string | null;
  image_tones: string[]; description: string | null;
};

/** Map a products row to the app Product type used across the storefront. */
export function rowToProduct(row: ProductRow): Product {
  const tones = row.image_tones as Tone[];
  return {
    slug: row.slug,
    sku: row.sku,
    titleBn: row.title,
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    rating: row.rating,
    reviewCount: row.review_count,
    ageTierSlug: row.age_tier_slug,
    categorySlug: row.category_slug,
    badge: row.badge ?? undefined,
    imageTones: [tones[0] ?? "cream", tones[1] ?? "cream"],
    imageLabelBn: row.image_label ?? row.title,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- mappers`
Expected: 1 passing.

- [ ] **Step 5: Implement the read functions**

`src/lib/data/products.ts`:
```ts
import { unstable_cache } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { rowToProduct } from "@/lib/data/mappers";
import type { Product } from "@/lib/types";

export async function getProducts(): Promise<Product[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("products").select("*").eq("active", true);
  if (error) throw error;
  return (data ?? []).map(rowToProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("products").select("*").eq("slug", slug).eq("active", true).maybeSingle();
  return data ? rowToProduct(data) : null;
}

export async function getAllProductSlugs(): Promise<string[]> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("products").select("slug").eq("active", true);
  return (data ?? []).map((r) => r.slug);
}
```
(Before using `unstable_cache`/tags, READ `node_modules/next/dist/docs/` for the current caching API; adjust import if the guide names a different symbol. Write `catalog.ts` and `blog.ts` with the same shape — select, map, return.)

- [ ] **Step 6: Verify reads against the DB**

Seed is not loaded yet (Task 6), so add a temporary check: create `src/lib/data/_probe.ts` that logs `await getProducts()` count, run it via a scratch route or `tsx`, confirm no error and RLS lets the read through once rows exist. Delete `_probe.ts` after. (This step just confirms wiring; real data arrives in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/data/
git commit -m "feat(data): product/catalog/blog read layer and row mappers"
```

---

## Task 6: Seed script (mock → DB + images)

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add `db:seed`)

**Interfaces:**
- Consumes: `products`, `categories`, `ageTiers`, `blogPosts` from `src/lib/mock/*`; `createAdminSupabase` (Task 2).

- [ ] **Step 1: Add the seed script**

`package.json` scripts: `"db:seed": "tsx --env-file=.env.local scripts/seed.ts"`. Install tsx if missing: `npm install -D tsx`.

- [ ] **Step 2: Write `scripts/seed.ts`**

Insert categories and age_tiers first (products reference them), then products, variants, inventory, then blog posts. For each product, upload `public/images/products/<slug>/*.webp` to a Storage bucket `product-images` and record the public URL. Full code:
```ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createAdminSupabase } from "../src/lib/supabase/admin";
import { products } from "../src/lib/mock/products";
import { categories } from "../src/lib/mock/categories";
import { ageTiers } from "../src/lib/mock/age-tiers";
import { blogPosts } from "../src/lib/mock/blog";

const db = createAdminSupabase();

async function main() {
  await db.from("categories").upsert(
    categories.map((c, i) => ({ slug: c.slug, title: c.nameBn, sort: i })),
  );
  await db.from("age_tiers").upsert(
    ageTiers.map((a, i) => ({ slug: a.slug, title: a.labelBn, sort: i })),
  );

  for (const p of products) {
    const { data: prod } = await db.from("products").upsert({
      slug: p.slug, sku: p.sku, title: p.titleBn, price: p.price,
      compare_at_price: p.compareAtPrice ?? null, rating: p.rating,
      review_count: p.reviewCount, age_tier_slug: p.ageTierSlug,
      category_slug: p.categorySlug, badge: p.badge ?? null,
      image_label: p.imageLabelBn, image_tones: p.imageTones, active: true,
    }, { onConflict: "slug" }).select("id").single();
    if (!prod) continue;
    await db.from("inventory").upsert({ product_id: prod.id, stock_qty: 25 });
    if (p.variants?.length)
      await db.from("product_variants").insert(
        p.variants.map((v) => ({ product_id: prod.id, name: v.name, tone: v.tone })),
      );
    // images
    const dir = join(process.cwd(), "public", "images", "products", p.slug);
    if (existsSync(dir))
      for (const file of readdirSync(dir)) {
        await db.storage.from("product-images")
          .upload(`${p.slug}/${file}`, readFileSync(join(dir, file)),
            { upsert: true, contentType: "image/webp" });
      }
  }

  await db.from("blog_posts").upsert(
    blogPosts.map((b) => ({
      slug: b.slug, title: b.title, excerpt: b.excerpt, body: b.body,
      author: b.author, cover_image: b.coverImage, category: b.category,
      read_mins: b.readMins, date_iso: b.dateISO, featured: b.featured ?? false,
      published: true,
    })),
  );
  console.log("seed complete");
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
```
(Create the `product-images` Storage bucket, public, in the Supabase dashboard first. Field names are confirmed against the mock: `Category.nameBn`, `AgeTier.labelBn`, and blog `title/excerpt/body/author/coverImage/category/readMins/dateISO/featured`.)

- [ ] **Step 3: Run the seed**

Run: `npm run db:seed`
Expected: "seed complete"; Table editor shows 17 products, 9 categories, 5 age tiers, blog posts; Storage `product-images` holds the webp files.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed.ts package.json package-lock.json
git commit -m "feat(data): seed script for mock data and product images"
```

---

## Task 7: Swap storefront pages onto the data layer

**Files:**
- Modify (enumerate by grepping `from "@/lib/mock/products"` etc.): product detail page `src/app/products/[slug]/page.tsx`, collection pages `src/app/collections/[slug]/page.tsx`, blog pages `src/app/blog/page.tsx` + `src/app/blog/[slug]/page.tsx`, home page product rails, search.

**Interfaces:**
- Consumes: Task 5 read functions.

- [ ] **Step 1: Find every mock import used for storefront rendering**

Run: `grep -rn 'from "@/lib/mock/\(products\|categories\|age-tiers\|blog\)"' src/app src/components`
List each file; these are the swap sites.

- [ ] **Step 2: Replace mock calls with data-layer calls, page by page**

For each page, change the import and `await` the async read. Example — `src/app/products/[slug]/page.tsx`: replace `productBySlug(slug)` with `await getProductBySlug(slug)`; replace `generateStaticParams` product list with `await getAllProductSlugs()`. Keep the page a Server Component. READ `node_modules/next/dist/docs/` for `generateStaticParams` before editing it.

- [ ] **Step 3: Verify each swapped route renders**

Run the dev server and curl each swapped route; expect HTTP 200 and real content. Example:
```bash
for r in / /products/nesting-cups /collections/all /blog /blog/screen-free-play-ideas; do
  echo "$r -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002$r)"; done
```
Expected: all 200.

- [ ] **Step 4: Commit**

```bash
git add src/app src/components
git commit -m "feat(data): read storefront catalog and blog from Supabase"
```

---

## Task 8: Pre-order UI treatment

**Files:**
- Create: `src/lib/data/products.ts` addition `getProductStates()` (batch) OR extend detail read to include stock.
- Modify: `src/components/product/product-card.tsx`, `src/components/product/product-details-view.tsx`

**Interfaces:**
- Consumes: `getProductState` (Task 4). Product detail read must also return `stockQty` and `preorderShipDate` (extend `getProductBySlug` to select from `inventory` join and pass these through, or add fields to the returned object as `availability: ProductAvailability`).

- [ ] **Step 1: Extend the detail read to carry availability**

In `getProductBySlug`, join `inventory` and compute `availability = getProductState({ stockQty, preorderShipDate, now: new Date() })`. Return `{ ...product, availability }`. (Add `availability?: ProductAvailability` to the returned type; do not mutate the shared `Product` type used by mock.)

- [ ] **Step 2: Pre-order badge on the card**

In `product-card.tsx`, when `availability.state === "preorder"`, render a "Pre-order" badge (reuse the existing `Badge` component and neem styling) instead of the category badge. Verify: set one product's stock to 0 and a future ship date in Supabase, reload its card, see the badge.

- [ ] **Step 3: Pre-order CTA copy on the PDP**

In `product-details-view.tsx`, when `availability.state === "preorder"`, change the primary CTA label to "Pre-order now" and show a line "Ships from <formatDate(shipDate)>". When `sold_out`, disable the CTA and label it "Sold out". Verify both states by toggling stock/date in Supabase.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/products.ts src/components/product/
git commit -m "feat(data): pre-order and sold-out treatment on card and PDP"
```

---

## Task 9: `createOrder` server action (TDD)

**Files:**
- Create: `src/lib/data/orders.ts`, `src/lib/data/orders.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function computeOrderTotals(
    lines: { unitPrice: number; qty: number }[],
    deliveryFee: number,
  ): { subtotal: number; total: number; lineTotals: number[] };

  export type CreateOrderInput = {
    customer: { name: string; phone: string; email?: string };
    address: { division: string; district: string; area: string; addressLine: string; landmark?: string };
    lines: { slug: string; qty: number }[];
    notes?: string;
    deliveryFee: number;
  };
  export type CreateOrderResult =
    | { ok: true; orderNumber: string; total: number }
    | { ok: false; error: string };
  export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  ```

- [ ] **Step 1: Write the failing totals test**

`src/lib/data/orders.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { computeOrderTotals } from "@/lib/data/orders";

describe("computeOrderTotals", () => {
  it("sums line totals and adds delivery", () => {
    const r = computeOrderTotals(
      [{ unitPrice: 720, qty: 5 }, { unitPrice: 1000, qty: 2 }], 60);
    expect(r.lineTotals).toEqual([3600, 2000]);
    expect(r.subtotal).toBe(5600);
    expect(r.total).toBe(5660);
  });
  it("handles an empty order", () => {
    expect(computeOrderTotals([], 0)).toEqual({ subtotal: 0, total: 0, lineTotals: [] });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- orders`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `computeOrderTotals` and `createOrder`**

Before writing the server action, READ `node_modules/next/dist/docs/` for the `"use server"` server-action contract and `revalidateTag`. `src/lib/data/orders.ts`:
```ts
"use server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getProductState } from "@/lib/data/product-state";

export function computeOrderTotals(
  lines: { unitPrice: number; qty: number }[],
  deliveryFee: number,
) {
  const lineTotals = lines.map((l) => l.unitPrice * l.qty);
  const subtotal = lineTotals.reduce((s, n) => s + n, 0);
  return { subtotal, total: subtotal + deliveryFee, lineTotals };
}

export type CreateOrderInput = {
  customer: { name: string; phone: string; email?: string };
  address: { division: string; district: string; area: string; addressLine: string; landmark?: string };
  lines: { slug: string; qty: number }[];
  notes?: string;
  deliveryFee: number;
};
export type CreateOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const db = createAdminSupabase();
  if (!input.lines.length) return { ok: false, error: "Empty order." };

  // Re-read prices + stock server-side. Never trust client prices.
  const slugs = input.lines.map((l) => l.slug);
  const { data: rows } = await db.from("products")
    .select("id, slug, title, price, preorder_ship_date, inventory(stock_qty)")
    .in("slug", slugs).eq("active", true);
  const bySlug = new Map((rows ?? []).map((r) => [r.slug, r]));

  const items: {
    product_id: string; title: string; unit_price: number; qty: number;
    line_total: number; fulfillment_type: "in_stock" | "preorder";
    preorder_ship_date: string | null;
  }[] = [];
  for (const line of input.lines) {
    const p = bySlug.get(line.slug);
    if (!p) return { ok: false, error: `Product unavailable: ${line.slug}` };
    const stockQty = (p.inventory as { stock_qty: number }[])?.[0]?.stock_qty ?? 0;
    const state = getProductState({ stockQty, preorderShipDate: p.preorder_ship_date });
    let fulfillment: "in_stock" | "preorder";
    if (state.state === "in_stock") {
      const remaining = await db.rpc("decrement_stock",
        { p_product_id: p.id, p_qty: line.qty });
      fulfillment = remaining.data === -1
        ? (p.preorder_ship_date ? "preorder" : "in_stock") : "in_stock";
      if (remaining.data === -1 && !p.preorder_ship_date)
        return { ok: false, error: `Out of stock: ${p.title}` };
    } else if (state.state === "preorder") {
      fulfillment = "preorder";
    } else {
      return { ok: false, error: `Sold out: ${p.title}` };
    }
    items.push({
      product_id: p.id, title: p.title, unit_price: p.price, qty: line.qty,
      line_total: p.price * line.qty, fulfillment_type: fulfillment,
      preorder_ship_date: fulfillment === "preorder" ? p.preorder_ship_date : null,
    });
  }

  const { subtotal, total } = computeOrderTotals(
    items.map((i) => ({ unitPrice: i.unit_price, qty: i.qty })), input.deliveryFee);
  const orderNumber = `TT-${Date.now().toString(36).toUpperCase()}`;

  const { data: order, error } = await db.from("orders").insert({
    order_number: orderNumber, customer_name: input.customer.name,
    customer_phone: input.customer.phone, customer_email: input.customer.email ?? null,
    division: input.address.division, district: input.address.district,
    area: input.address.area, address_line: input.address.addressLine,
    landmark: input.address.landmark ?? null, subtotal, delivery_fee: input.deliveryFee,
    total, notes: input.notes ?? null,
  }).select("id").single();
  if (error || !order) return { ok: false, error: "Could not place order." };

  await db.from("order_items").insert(items.map((i) => ({ ...i, order_id: order.id })));
  return { ok: true, orderNumber, total };
}
```

- [ ] **Step 4: Run to verify totals pass**

Run: `npm test -- orders`
Expected: 2 passing. (The pure `computeOrderTotals` is unit-tested; `createOrder` is verified end-to-end in Task 10.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/orders.ts src/lib/data/orders.test.ts
git commit -m "feat(data): createOrder server action with price snapshot and stock decrement"
```

---

## Task 10: Wire checkout CTA to `createOrder`

**Files:**
- Modify: `src/components/checkout/checkout-view.tsx`

**Interfaces:**
- Consumes: `createOrder` (Task 9), `useCart` (`src/lib/cart/cart-context.tsx`).

- [ ] **Step 1: Replace the toast handler with a real submit**

In `checkout-view.tsx`, replace `onCta` (currently a `toast.info`) with an async handler that builds `CreateOrderInput` from cart `items`, `address`, `notes`, and the computed `delivery`, calls `createOrder`, and on `ok` clears the cart (`clear()`) and routes to a confirmation (reuse toast + `router.push("/")` for now, or a simple `/checkout?placed=<orderNumber>` state). On `!ok`, `toast.error(result.error)`. Remove the mock 10% discount line (real orders have no phantom discount) — set `discount = 0` and drop it from the summary, or leave the summary prop at 0.

- [ ] **Step 2: Verify end-to-end (drive the app)**

With the dev server and a seeded DB: add a product to the cart, go to `/checkout`, fill the guest form, place the order. Expected: success toast with an order number; the row appears in Supabase `orders` + `order_items`; `inventory.stock_qty` for that product dropped by the ordered qty. Then set a product to stock 0 + future ship date, order it, and confirm its `order_items.fulfillment_type = 'preorder'` and stock did NOT go negative.

- [ ] **Step 3: Commit**

```bash
git add src/components/checkout/checkout-view.tsx
git commit -m "feat(checkout): place real COD orders via createOrder"
```

---

## Self-Review Notes

- **Spec coverage:** schema (T3), data-access layer (T5), order flow with server-side price re-read + atomic decrement (T9), pre-order derived state (T4/T8), migration + image upload (T6), RLS (T3), ISR swap (T7), Vitest on money/stock logic (T1/T4/T9). All spec sections map to a task.
- **Deferred correctly:** no admin UI, no auth, no payment gateway — matches spec non-goals.
- **Manual prerequisites** (flagged in-task): create Supabase project (T2), run migration SQL (T3), create `product-images` bucket (T6). These need a human; every code step around them is complete.
- **Mock field names verified:** `Category.nameBn`, `AgeTier.labelBn`, and the blog fields used by the seed all match the real mock files (checked while writing this plan).
- **`Date.now()` in `createOrder` (T9):** used only for the order-number suffix, in a server action — fine here (the Workflow-script restriction on `Date.now()` does not apply to app code).

---

## Amendment (2026-07-16) — Overlay hybrid model (Tasks 5–8 revised)

Discovered during execution: the app's product data is richer than the schema
(ProductDetail, variants, kit contents, category/age-tier presentation, blog
covers), AND ~20 files — including CLIENT components (cart, wishlist, search,
recently-viewed) — read the mock product catalog synchronously, which async DB
reads cannot replace without a large client-data-layer refactor.

Decision (user-approved): **overlay hybrid.** The DB is the source of truth for
the *operational* fields only — **price, stock, pre-order date** — overlaid onto
the mock catalog structure in server components. Orders re-read price/stock from
the DB authoritatively. Editorial content (PDP detail, category/age-tier
presentation, blog) and the client cart/wishlist/search stay on mock for this
phase. Editing price/stock/pre-order becomes code-free on all server-rendered
pages; adding a brand-new product still needs a mock entry (deferred to a later
catalog-in-DB phase). Client cart *display* price stays from mock (createOrder is
authoritative; COD confirms on delivery) — documented limitation.

Tasks 5–8 below are superseded by the custom briefs in `.superpowers/sdd/`
(task-5..8). Tasks 9–10 (createOrder, checkout wiring) are unchanged.
