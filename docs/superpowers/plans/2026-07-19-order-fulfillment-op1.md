# Order Fulfillment OP-1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin a full COD order-fulfillment surface — status workflow, courier tracking, payment status, inventory-restoring cancel, an internal timeline, list filters, and a downloadable/printable PDF invoice.

**Architecture:** A pure status-workflow state machine is the transition authority (UI + server). Migration 0011 adds payment/tracking/timestamp columns, an `order_status_history` timeline table, and an atomic `cancel_order` RPC. Admin server actions (service-role, admin-gated) perform each transition and append a history row. A reusable `@react-pdf/renderer` invoice engine (pure data builder + document + Node route) powers admin Download/Print and is reused by OP-2.

**Tech Stack:** Next.js 16.2.9 (App Router, `src/proxy.ts` middleware), Supabase (service-role admin client + RPC), `@react-pdf/renderer`, vitest (TDD), Tailwind (cream/ink palette), lucide-react, sonner toasts.

## Global Constraints

- Next.js is **non-standard (v16)** — before writing route handlers / runtime config, read the relevant guide in `node_modules/next/dist/docs/`. Middleware is `src/proxy.ts`, not `middleware.ts`.
- New columns/tables are absent from the generated `src/lib/supabase/database.types.ts` → **reads** use `.overrideTypes<Row[], { merge:false }>()`; **writes / RPC args** cast `as never`.
- Every admin write action re-checks `getIsAdmin()` (throw `"unauthorized"`), uses `createAdminSupabase()` (service-role), and calls `revalidatePath('/admin/orders')` + `revalidatePath(\`/admin/orders/${orderId}\`)`.
- Money is **integer BDT (৳)**; format with `formatTk` from `@/lib/format`. Dates with `formatDate`.
- Order statuses are exactly `pending | confirmed | shipped | delivered | cancelled` — do **not** rename or add statuses.
- Carrier ∈ `Pathao | Steadfast | RedX | Sundarban | Paperfly | eCourier | Other`.
- Pure logic is TDD (test first, watch it fail, implement, pass). Run `npx tsc --noEmit && npx vitest run && npm run build` before each commit; all clean/green. A build-time `column ... does not exist` fail-soft warning is expected until migration 0011 is applied to the dev DB — not a failure.
- Do **not** `git add` `.env.local` or `.superpowers/`.
- `ActionResult` type and `getIsAdmin`/`createAdminSupabase` already exist in `src/lib/admin/actions.ts` — reuse them.

---

### Task 1: Migration 0011 — fulfillment schema, history table, cancel RPC

**Files:**
- Create: `supabase/migrations/0011_order_fulfillment.sql`

**Interfaces:**
- Produces (DB surface later tasks rely on): `orders.payment_status` (`pending|paid|refunded`), `orders.paid_at`, `orders.carrier`, `orders.tracking_number`, `orders.tracking_url`, `orders.confirmed_at`, `orders.shipped_at`, `orders.delivered_at`, `orders.cancelled_at`, `orders.cancel_reason`, `orders.updated_at`; table `order_status_history(id, order_id, status, note, changed_by, created_at)`; RPC `cancel_order(p_order_id uuid, p_reason text, p_changed_by text) returns void`.

- [ ] **Step 1: Write the migration file** (SQL only — no code compiles against it yet; the user applies it in the Supabase SQL editor before merge).

```sql
-- 0011_order_fulfillment.sql — OP-1 admin fulfillment: payment status, courier tracking,
-- per-status timestamps, updated_at trigger, status-history timeline, atomic cancel+restore.
-- Apply in the Supabase SQL editor after 0010_blog_extras.sql.

alter table orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','paid','refunded'));
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists carrier text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
alter table orders add column if not exists confirmed_at timestamptz;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists cancelled_at timestamptz;
alter table orders add column if not exists cancel_reason text;
alter table orders add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx
  on order_status_history(order_id, created_at);

create or replace function cancel_order(p_order_id uuid, p_reason text, p_changed_by text)
returns void language plpgsql as $$
declare v_was_paid boolean; v_status text;
begin
  select payment_status = 'paid', status into v_was_paid, v_status
    from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_status not in ('pending','confirmed') then
    raise exception 'cannot_cancel_from:%', v_status;
  end if;

  update inventory i set stock_qty = i.stock_qty + oi.qty
    from order_items oi
    where oi.order_id = p_order_id and oi.fulfillment_type = 'in_stock'
      and i.product_id = oi.product_id;

  update orders set
    status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(p_reason,''),
    payment_status = case when v_was_paid then 'refunded' else payment_status end
    where id = p_order_id;

  insert into order_status_history (order_id, status, note, changed_by)
    values (p_order_id, 'cancelled', nullif(p_reason,''), p_changed_by);
end $$;
revoke execute on function cancel_order(uuid, text, text) from anon, authenticated;

alter table order_status_history enable row level security;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0011_order_fulfillment.sql
git commit -m "feat(orders): migration 0011 — fulfillment schema, history, cancel RPC"
```

---

### Task 2: Pure status-workflow module (TDD)

**Files:**
- Create: `src/lib/orders/status-workflow.ts`
- Test: `src/lib/orders/status-workflow.test.ts`

**Interfaces:**
- Produces: `type OrderStatus = 'pending'|'confirmed'|'shipped'|'delivered'|'cancelled'`; `ORDER_STATUSES: OrderStatus[]`; `canTransition(from: OrderStatus, to: OrderStatus): boolean`; `allowedTransitions(status: OrderStatus): OrderStatus[]`; `timestampFieldFor(status: OrderStatus): 'confirmed_at'|'shipped_at'|'delivered_at'|'cancelled_at'|null`; `isOrderStatus(v: string): v is OrderStatus`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/orders/status-workflow.test.ts
import { describe, it, expect } from "vitest";
import {
  canTransition, allowedTransitions, timestampFieldFor, isOrderStatus, ORDER_STATUSES,
} from "./status-workflow";

describe("status-workflow", () => {
  it("lists the five statuses", () => {
    expect(ORDER_STATUSES).toEqual(["pending","confirmed","shipped","delivered","cancelled"]);
  });
  it("allows legal transitions", () => {
    expect(canTransition("pending","confirmed")).toBe(true);
    expect(canTransition("pending","cancelled")).toBe(true);
    expect(canTransition("confirmed","shipped")).toBe(true);
    expect(canTransition("confirmed","cancelled")).toBe(true);
    expect(canTransition("shipped","delivered")).toBe(true);
  });
  it("rejects illegal transitions", () => {
    expect(canTransition("pending","shipped")).toBe(false);
    expect(canTransition("delivered","pending")).toBe(false);
    expect(canTransition("shipped","cancelled")).toBe(false);
    expect(canTransition("cancelled","pending")).toBe(false);
    expect(canTransition("delivered","cancelled")).toBe(false);
    expect(canTransition("confirmed","confirmed")).toBe(false);
  });
  it("returns allowed transitions per status", () => {
    expect(allowedTransitions("pending")).toEqual(["confirmed","cancelled"]);
    expect(allowedTransitions("confirmed")).toEqual(["shipped","cancelled"]);
    expect(allowedTransitions("shipped")).toEqual(["delivered"]);
    expect(allowedTransitions("delivered")).toEqual([]);
    expect(allowedTransitions("cancelled")).toEqual([]);
  });
  it("maps a status to its timestamp column", () => {
    expect(timestampFieldFor("confirmed")).toBe("confirmed_at");
    expect(timestampFieldFor("shipped")).toBe("shipped_at");
    expect(timestampFieldFor("delivered")).toBe("delivered_at");
    expect(timestampFieldFor("cancelled")).toBe("cancelled_at");
    expect(timestampFieldFor("pending")).toBeNull();
  });
  it("guards status strings", () => {
    expect(isOrderStatus("shipped")).toBe(true);
    expect(isOrderStatus("nope")).toBe(false);
  });
});
```

- [ ] **Step 2: Run it — verify it fails**

Run: `npx vitest run src/lib/orders/status-workflow.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/orders/status-workflow.ts
export const ORDER_STATUSES = [
  "pending", "confirmed", "shipped", "delivered", "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const TIMESTAMP_FIELD: Record<OrderStatus, string | null> = {
  pending: null,
  confirmed: "confirmed_at",
  shipped: "shipped_at",
  delivered: "delivered_at",
  cancelled: "cancelled_at",
};

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(v);
}
export function allowedTransitions(status: OrderStatus): OrderStatus[] {
  return TRANSITIONS[status];
}
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
export function timestampFieldFor(
  status: OrderStatus,
): "confirmed_at" | "shipped_at" | "delivered_at" | "cancelled_at" | null {
  return TIMESTAMP_FIELD[status] as
    | "confirmed_at" | "shipped_at" | "delivered_at" | "cancelled_at" | null;
}
```

- [ ] **Step 4: Run tests — verify pass**

Run: `npx vitest run src/lib/orders/status-workflow.test.ts`
Expected: PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/orders/status-workflow.ts src/lib/orders/status-workflow.test.ts
git commit -m "feat(orders): pure status-workflow state machine (TDD)"
```

---

### Task 3: Invoice engine — data builder (TDD) + PDF document + generator

**Files:**
- Modify: `package.json` (add `@react-pdf/renderer`)
- Create: `src/lib/invoice/build-invoice-data.ts`, `src/lib/invoice/build-invoice-data.test.ts`, `src/lib/invoice/invoice-document.tsx`, `src/lib/invoice/generate-invoice-pdf.ts`
- Reference for input shape: `src/lib/admin/queries.ts` `AdminOrderDetail` (has `orderNumber`, `createdAt`, `customerName/Phone/Email`, `division/district/area/addressLine/landmark`, `items[]` with `title/qty/unitPrice/lineTotal`, `subtotal/deliveryFee/advanceTotal/total`, `paymentMethod`); `src/lib/data/settings-shape.ts` `Settings` (`contact.{phone,email,address}`, `brand.tagline`); store name in `@/lib/config` (`BRAND_*`).

**Interfaces:**
- Produces: `type InvoiceItem = { title: string; qty: number; unitPrice: number; lineTotal: number }`; `type InvoiceData = { orderNumber; dateIso: string; paymentStatusLabel: string; orderStatusLabel: string; from: { name: string; tagline?: string; phone: string; email: string; address: string }; to: { name: string; phone: string; email?: string; address: string }; items: InvoiceItem[]; subtotal: number; deliveryFee: number; advanceTotal: number; total: number }`; `buildInvoiceData(order, settings, storeName): InvoiceData`; `generateInvoicePdf(data: InvoiceData): Promise<Buffer>`; `InvoiceDocument({ data }: { data: InvoiceData })` (a react-pdf `Document`).
- Consumes (input `order`): the `AdminOrderDetail`-shaped object; keep the `buildInvoiceData` param type structural (only the fields it reads) so it doesn't couple to the full query type.

- [ ] **Step 1: Add the dependency**

Run: `npm install @react-pdf/renderer@^4`
Expected: `package.json` gains `@react-pdf/renderer`. Commit the lockfile change with this task.

- [ ] **Step 2: Write the failing test for `buildInvoiceData`**

```ts
// src/lib/invoice/build-invoice-data.test.ts
import { describe, it, expect } from "vitest";
import { buildInvoiceData } from "./build-invoice-data";

const settings = {
  contact: { phone: "+880111", email: "hello@toytuni.com", address: "Dhaka, BD", whatsapp: "" },
  brand: { tagline: "Play. Learn. Grow.", description: "" },
  shipping: { insideDhakaFee: 80, outsideDhakaFee: 150, freeShippingThreshold: 2000 },
  codFee: 0,
} as const;

const order = {
  orderNumber: "TT-ABC", createdAt: "2026-07-19T10:00:00.000Z",
  status: "shipped", paymentStatus: "paid",
  customerName: "Rima", customerPhone: "+880999", customerEmail: "rima@x.com",
  division: "Dhaka", district: "Dhaka", area: "Mirpur", addressLine: "Road 1", landmark: "Near mosque",
  items: [{ title: "Blocks", qty: 2, unitPrice: 500, lineTotal: 1000 }],
  subtotal: 1000, deliveryFee: 80, advanceTotal: 0, total: 1080, paymentMethod: "cod",
};

describe("buildInvoiceData", () => {
  it("maps order + settings into invoice data", () => {
    const d = buildInvoiceData(order, settings, "toytuni");
    expect(d.orderNumber).toBe("TT-ABC");
    expect(d.from.name).toBe("toytuni");
    expect(d.from.phone).toBe("+880111");
    expect(d.to.name).toBe("Rima");
    expect(d.to.address).toContain("Road 1");
    expect(d.to.address).toContain("Mirpur");
    expect(d.items).toHaveLength(1);
    expect(d.total).toBe(1080);
    expect(d.paymentStatusLabel).toBe("Paid");
    expect(d.orderStatusLabel).toBe("Shipped");
  });
  it("labels an unpaid pending order", () => {
    const d = buildInvoiceData({ ...order, paymentStatus: "pending", status: "pending" }, settings, "toytuni");
    expect(d.paymentStatusLabel).toBe("Pending");
    expect(d.orderStatusLabel).toBe("Pending");
  });
  it("omits landmark cleanly when absent", () => {
    const d = buildInvoiceData({ ...order, landmark: null }, settings, "toytuni");
    expect(d.to.address).not.toContain("null");
  });
});
```

- [ ] **Step 3: Run it — verify it fails**

Run: `npx vitest run src/lib/invoice/build-invoice-data.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `build-invoice-data.ts`**

```ts
// src/lib/invoice/build-invoice-data.ts
export type InvoiceItem = { title: string; qty: number; unitPrice: number; lineTotal: number };
export type InvoiceData = {
  orderNumber: string;
  dateIso: string;
  paymentStatusLabel: string;
  orderStatusLabel: string;
  from: { name: string; tagline?: string; phone: string; email: string; address: string };
  to: { name: string; phone: string; email?: string; address: string };
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  advanceTotal: number;
  total: number;
};

type OrderLike = {
  orderNumber: string; createdAt: string; status: string; paymentStatus: string;
  customerName: string; customerPhone: string; customerEmail?: string | null;
  division: string; district: string; area: string; addressLine: string; landmark?: string | null;
  items: { title: string; qty: number; unitPrice: number; lineTotal: number }[];
  subtotal: number; deliveryFee: number; advanceTotal: number; total: number;
};
type SettingsLike = { contact: { phone: string; email: string; address: string }; brand: { tagline: string } };

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function buildInvoiceData(order: OrderLike, settings: SettingsLike, storeName: string): InvoiceData {
  const toAddress = [order.addressLine, order.landmark, `${order.area}, ${order.district}, ${order.division}`]
    .filter((p): p is string => Boolean(p && p.trim()))
    .join("\n");
  return {
    orderNumber: order.orderNumber,
    dateIso: order.createdAt,
    paymentStatusLabel: cap(order.paymentStatus),
    orderStatusLabel: cap(order.status),
    from: {
      name: storeName, tagline: settings.brand.tagline,
      phone: settings.contact.phone, email: settings.contact.email, address: settings.contact.address,
    },
    to: {
      name: order.customerName, phone: order.customerPhone,
      email: order.customerEmail ?? undefined, address: toAddress,
    },
    items: order.items.map((i) => ({ title: i.title, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
    subtotal: order.subtotal, deliveryFee: order.deliveryFee, advanceTotal: order.advanceTotal, total: order.total,
  };
}
```

- [ ] **Step 5: Run tests — verify pass**

Run: `npx vitest run src/lib/invoice/build-invoice-data.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement the PDF document + generator** (no unit test — visual; covered by the integration download check)

`src/lib/invoice/invoice-document.tsx` — a `@react-pdf/renderer` `Document`. Use `Document, Page, View, Text, StyleSheet` from `@react-pdf/renderer`. Render `৳` amounts with a local helper `const tk = (n: number) => \`৳${n.toLocaleString("en-US")}\`` (note: the built-in Helvetica font has no Bengali glyphs, but `৳` U+09F3 renders acceptably; if it shows as tofu in the integration check, fall back to `"Tk "` prefix — decide during the live check). Layout: header (`from.name` bold + `from.tagline` + `from.phone`/`from.email`/`from.address`), an "INVOICE" title + `orderNumber` + `formatDate(dateIso.slice(0,10))` + `paymentStatusLabel`/`orderStatusLabel`, a "Bill to" block (`to.*`, address is multi-line — split on `\n`), an items table (Item / Qty / Unit / Line total), and a totals block (Subtotal, Delivery, Advance if `>0`, Total bold). Keep styles inline via `StyleSheet.create`. Export `InvoiceDocument`.

`src/lib/invoice/generate-invoice-pdf.ts`:
```ts
import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocument } from "./invoice-document";
import type { InvoiceData } from "./build-invoice-data";

export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
```
(If `renderToBuffer(<.../>)` in a `.ts` file trips JSX, name the file `generate-invoice-pdf.tsx`.)

- [ ] **Step 7: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean / green / build ok.
```bash
git add package.json package-lock.json src/lib/invoice/
git commit -m "feat(orders): invoice engine — data builder (TDD) + react-pdf document"
```

---

### Task 4: Extend order queries + types + history reader

**Files:**
- Modify: `src/lib/admin/queries.ts`

**Interfaces:**
- Consumes: migration 0011 columns (Task 1).
- Produces: extended `AdminOrderListItem` (+ `paymentStatus: string; trackingNumber: string | null; carrier: string | null`); extended `AdminOrderDetail` (+ `status` already present; add `paymentStatus`, `paidAt: string | null`, `carrier`, `trackingNumber`, `trackingUrl` (all `string | null`), `confirmedAt`/`shippedAt`/`deliveredAt`/`cancelledAt` (`string | null`), `cancelReason: string | null`, `updatedAt: string`); `type OrderHistoryItem = { id: string; status: string; note: string | null; changedBy: string | null; createdAt: string }`; `getOrderStatusHistory(orderId: string): Promise<OrderHistoryItem[]>` (service-role, oldest-first).

- [ ] **Step 1: Extend the list query.** In `getAdminOrders()` add `payment_status, tracking_number, carrier` to the `.select(...)`, add them to `AdminOrderRow`, and map to `paymentStatus`, `trackingNumber`, `carrier` on `AdminOrderListItem`.

- [ ] **Step 2: Extend the detail query.** In `getAdminOrderById()` add the new columns to the `.select(...)` and `AdminOrderDetailRow`, and map onto `AdminOrderDetail` (camelCase; null-safe). Keep the existing item mapping.

- [ ] **Step 3: Add `getOrderStatusHistory`.**
```ts
export type OrderHistoryItem = {
  id: string; status: string; note: string | null; changedBy: string | null; createdAt: string;
};
export async function getOrderStatusHistory(orderId: string): Promise<OrderHistoryItem[]> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("order_status_history")
    .select("id, status, note, changed_by, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })
    .overrideTypes<
      { id: string; status: string; note: string | null; changed_by: string | null; created_at: string }[],
      { merge: false }
    >();
  if (error) throw new Error(`getOrderStatusHistory failed: ${error.message}`);
  return (data ?? []).map((r) => ({
    id: r.id, status: r.status, note: r.note, changedBy: r.changed_by, createdAt: r.created_at,
  }));
}
```

- [ ] **Step 4: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc clean, tests green.
```bash
git add src/lib/admin/queries.ts
git commit -m "feat(orders): extend order queries/types + status-history reader"
```

---

### Task 5: Admin fulfillment actions

**Files:**
- Modify: `src/lib/admin/actions.ts`

**Interfaces:**
- Consumes: `canTransition`, `timestampFieldFor`, `isOrderStatus`, `OrderStatus` (Task 2); `getSessionUser`/`getIsAdmin` (`@/lib/auth/session`); `createAdminSupabase`; `ActionResult`.
- Produces (server actions): `updateOrderStatus(orderId, to): Promise<ActionResult>` (reworked — rejects `cancelled`, routes through workflow); `shipOrder(orderId, input: { carrier: string; trackingNumber: string; trackingUrl?: string }): Promise<ActionResult>`; `markOrderPaid(orderId): Promise<ActionResult>`; `cancelOrder(orderId, reason: string): Promise<ActionResult>`; `addOrderNote(orderId, note: string): Promise<ActionResult>`.

- [ ] **Step 1: Add a shared helper + carrier constant** at the top of the orders section of `actions.ts`.
```ts
import { canTransition, timestampFieldFor, isOrderStatus, type OrderStatus } from "@/lib/orders/status-workflow";
import { getSessionUser } from "@/lib/auth/session";

export const ORDER_CARRIERS = ["Pathao","Steadfast","RedX","Sundarban","Paperfly","eCourier","Other"] as const;

async function currentOrderStatus(db: ReturnType<typeof createAdminSupabase>, orderId: string): Promise<OrderStatus | null> {
  const { data } = await db.from("orders").select("status").eq("id", orderId)
    .maybeSingle().overrideTypes<{ status: string }, { merge: false }>();
  return data && isOrderStatus(data.status) ? data.status : null;
}
async function actorEmail(): Promise<string> {
  const user = await getSessionUser();
  return user?.email ?? "system";
}
async function appendHistory(db: ReturnType<typeof createAdminSupabase>, orderId: string, status: string, note: string | null, by: string) {
  await db.from("order_status_history").insert({ order_id: orderId, status, note, changed_by: by } as never);
}
function revalidateOrder(orderId: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}
```

- [ ] **Step 2: Rework `updateOrderStatus`** — guard the transition, reject `cancelled` (that's `cancelOrder`'s job), stamp the timestamp, append history.
```ts
export async function updateOrderStatus(orderId: string, to: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  if (!isOrderStatus(to)) return { ok: false, error: "Invalid status." };
  if (to === "cancelled") return { ok: false, error: "Use cancel to cancel an order." };
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  if (!canTransition(from, to)) return { ok: false, error: `Cannot move ${from} → ${to}.` };
  const patch: Record<string, unknown> = { status: to };
  const ts = timestampFieldFor(to);
  if (ts) patch[ts] = new Date().toISOString();
  const { error } = await db.from("orders").update(patch as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, to, null, await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}
```

- [ ] **Step 3: Add `shipOrder`** — guard `confirmed→shipped`, validate carrier, write tracking + `shipped_at`, history note.
```ts
export async function shipOrder(
  orderId: string, input: { carrier: string; trackingNumber: string; trackingUrl?: string },
): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const carrier = input.carrier.trim();
  const trackingNumber = input.trackingNumber.trim();
  if (!(ORDER_CARRIERS as readonly string[]).includes(carrier)) return { ok: false, error: "Invalid carrier." };
  if (!trackingNumber) return { ok: false, error: "Tracking number is required." };
  const trackingUrl = input.trackingUrl?.trim() || null;
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  if (!canTransition(from, "shipped")) return { ok: false, error: `Cannot ship from ${from}.` };
  const { error } = await db.from("orders").update({
    status: "shipped", shipped_at: new Date().toISOString(),
    carrier, tracking_number: trackingNumber, tracking_url: trackingUrl,
  } as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, "shipped", `${carrier} · ${trackingNumber}`, await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}
```

- [ ] **Step 4: Add `markOrderPaid`** — only pending payment, not cancelled.
```ts
export async function markOrderPaid(orderId: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { data } = await db.from("orders").select("status, payment_status").eq("id", orderId)
    .maybeSingle().overrideTypes<{ status: string; payment_status: string }, { merge: false }>();
  if (!data) return { ok: false, error: "Order not found." };
  if (data.status === "cancelled") return { ok: false, error: "Order is cancelled." };
  if (data.payment_status !== "pending") return { ok: false, error: "Already settled." };
  const { error } = await db.from("orders").update({
    payment_status: "paid", paid_at: new Date().toISOString(),
  } as never).eq("id", orderId);
  if (error) return { ok: false, error: error.message };
  await appendHistory(db, orderId, data.status, "Marked paid", await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}
```

- [ ] **Step 5: Add `cancelOrder`** (atomic RPC) + `addOrderNote`.
```ts
export async function cancelOrder(orderId: string, reason: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const db = createAdminSupabase();
  const { error } = await db.rpc("cancel_order", {
    p_order_id: orderId, p_reason: reason.trim(), p_changed_by: await actorEmail(),
  } as never);
  if (error) {
    const msg = error.message.includes("cannot_cancel_from")
      ? "Only pending or confirmed orders can be cancelled." : error.message;
    return { ok: false, error: msg };
  }
  revalidateOrder(orderId);
  return { ok: true };
}

export async function addOrderNote(orderId: string, note: string): Promise<ActionResult> {
  if (!(await getIsAdmin())) throw new Error("unauthorized");
  const trimmed = note.trim();
  if (!trimmed) return { ok: false, error: "Note is empty." };
  if (trimmed.length > 1000) return { ok: false, error: "Note too long." };
  const db = createAdminSupabase();
  const from = await currentOrderStatus(db, orderId);
  if (!from) return { ok: false, error: "Order not found." };
  await appendHistory(db, orderId, from, trimmed, await actorEmail());
  revalidateOrder(orderId);
  return { ok: true };
}
```

- [ ] **Step 6: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean / green / build ok (fail-soft column warning tolerated).
```bash
git add src/lib/admin/actions.ts
git commit -m "feat(orders): admin fulfillment actions (status/ship/paid/cancel/note)"
```

---

### Task 6: Admin invoice route (PDF download)

**Files:**
- Create: `src/app/admin/orders/[id]/invoice/route.ts`

**Interfaces:**
- Consumes: `getAdminOrderById` (Task 4), `getSettings` (`@/lib/data/settings`), `buildInvoiceData` + `generateInvoicePdf` (Task 3), `getIsAdmin`, store name from `@/lib/config`.

- [ ] **Step 1: Read the route-handler + runtime guide** in `node_modules/next/dist/docs/` (Next 16 conventions for `route.ts`, `runtime`, params being a Promise).

- [ ] **Step 2: Implement the route.**
```ts
// src/app/admin/orders/[id]/invoice/route.ts
import { getIsAdmin } from "@/lib/auth/session";
import { getAdminOrderById } from "@/lib/admin/queries";
import { getSettings } from "@/lib/data/settings";
import { buildInvoiceData } from "@/lib/invoice/build-invoice-data";
import { generateInvoicePdf } from "@/lib/invoice/generate-invoice-pdf";
import { BRAND_NAME } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getIsAdmin())) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  const order = await getAdminOrderById(id);
  if (!order) return new Response("Not found", { status: 404 });
  const settings = await getSettings();
  const data = buildInvoiceData(order, settings, BRAND_NAME);
  const pdf = await generateInvoicePdf(data);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
    },
  });
}
```
(If `@/lib/config` has no `STORE_NAME`, use whatever the store's display name constant is — grep `config.ts` — or fall back to the literal `"toytuni"`.)

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npm run build`
Expected: clean; the route appears as a dynamic ƒ route.
```bash
git add src/app/admin/orders/[id]/invoice/route.ts
git commit -m "feat(orders): admin invoice PDF download route (node runtime)"
```

---

### Task 7: Order-detail UI — actions, tracking, payment badge, timeline

**Files:**
- Create: `src/components/admin/order-actions.tsx`, `src/components/admin/order-timeline.tsx`
- Modify: `src/app/admin/orders/[id]/page.tsx`
- Delete (replace usage): `src/components/admin/order-status-select.tsx` (remove after `OrderActions` covers status changes)

**Interfaces:**
- Consumes: actions from Task 5, `getOrderStatusHistory` (Task 4), `allowedTransitions` + `ORDER_CARRIERS`, `AdminOrderDetail`.

- [ ] **Step 1: Build `order-actions.tsx`** (client). Props: `{ orderId: string; status: OrderStatus; paymentStatus: string }`. Render, driven by `allowedTransitions(status)`:
  - a **Confirm** button (when `confirmed` is allowed) → `updateOrderStatus(orderId,'confirmed')`;
  - a **Ship** button (when `shipped` allowed) → opens a dialog with a **carrier `<select>`** (`ORDER_CARRIERS`), a tracking-number input, an optional tracking-URL input → `shipOrder(...)`;
  - a **Mark delivered** button (when `delivered` allowed) → `updateOrderStatus(orderId,'delivered')`;
  - a **Cancel** button (when `cancelled` allowed) → dialog with a reason textarea → `cancelOrder(...)`;
  - a **Mark as paid** button (when `paymentStatus === 'pending'` and status ≠ cancelled) → `markOrderPaid(orderId)`;
  - an **Add note** inline box → `addOrderNote(orderId, note)`;
  - **Download invoice** (anchor/button hitting `/admin/orders/${orderId}/invoice` via the blob-download pattern) + **Print** (`window.print()`).
  Use `useTransition`, `sonner` `toast` for `ActionResult` errors/success, and `router.refresh()` after success. Mirror the interaction/styling of an existing admin client component (e.g. `blog-category-manager.tsx` / `taxonomy-manager.tsx`) for dialogs + buttons. Blob download pattern:
  ```ts
  const res = await fetch(`/admin/orders/${orderId}/invoice`);
  if (!res.ok) { toast.error("Invoice failed"); return; }
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url; a.download = `invoice-${orderNumber}.pdf`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  ```
  (Pass `orderNumber` as a prop too.)

- [ ] **Step 2: Build `order-timeline.tsx`** (server component). Props: `{ items: OrderHistoryItem[] }`. Render a vertical timeline (dot + line), each entry: status label (capitalized), optional `note`, `changedBy`, and `formatDate`/time of `createdAt`. Empty state: "No activity yet." Match the cream/ink palette.

- [ ] **Step 3: Wire the detail page** (`[id]/page.tsx`): replace `<OrderStatusSelect .../>` with `<OrderActions orderId={order.id} orderNumber={order.orderNumber} status={order.status} paymentStatus={order.paymentStatus} />`. Add near the header a **payment-status badge** (Paid=green / Pending=amber / Refunded=slate) and, when `order.trackingNumber`, a **tracking block** (`carrier · trackingNumber`, linked if `trackingUrl`). Fetch history via `getOrderStatusHistory(order.id)` and render `<OrderTimeline items={history} />` in the sidebar under Customer. Show `cancelReason` when cancelled.

- [ ] **Step 4: Remove `order-status-select.tsx`** and any import of it.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean / green / build ok.
```bash
git add src/components/admin/order-actions.tsx src/components/admin/order-timeline.tsx src/app/admin/orders/[id]/page.tsx
git rm src/components/admin/order-status-select.tsx
git commit -m "feat(orders): order-detail actions, tracking, payment badge, timeline"
```

---

### Task 8: Orders list — payment badge, tracking indicator, filters

**Files:**
- Modify: `src/components/admin/orders-table.tsx`

**Interfaces:**
- Consumes: extended `AdminOrderListItem` (Task 4).

- [ ] **Step 1: Add columns.** In the list row, add a **payment-status badge** (same colour map as detail) and a small **tracking indicator** (a truck/📦 icon + carrier when `trackingNumber` present). Keep the existing columns and View link.

- [ ] **Step 2: Add filters.** Beside the existing search box, add two `<select>`s (client state): **status** (`all` + the 5 statuses) and **payment** (`all | pending | paid | refunded`). Extend the existing `filtered` computation to AND these in (mirror the existing search filter). Reset nothing else. Keep it client-side (the list is already fully loaded).

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean / green / build ok.
```bash
git add src/components/admin/orders-table.tsx
git commit -m "feat(orders): orders list — payment badge, tracking, status/payment filters"
```

---

## Final Verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean.
- [ ] **Apply `supabase/migrations/0011_order_fulfillment.sql`** in the Supabase SQL editor (release gate — before merge).
- [ ] End-to-end (migration applied, real admin session): confirm→ship (carrier+tracking saved, shown, timeline row)→deliver; mark-paid (badge + timeline); cancel a confirmed order → inventory restored (stock back up), status cancelled, (if paid) refunded, timeline row; illegal transition rejected; add note → timeline; **download invoice** → valid PDF (order#, items, ৳ totals, branding); **print** opens dialog; non-admin → invoice route 403; orders-list filters narrow correctly.
- [ ] Opus whole-branch review, then finish branch (PR to `master`; set the 5 per-branch Supabase preview env vars if the preview reports `supabaseUrl is required`, then redeploy).

## Self-Review

- **Spec coverage:** schema/history/cancel-RPC → T1; workflow → T2; invoice engine → T3; queries/types/history reader → T4; actions (status/ship/paid/cancel/note) → T5; invoice route → T6; detail UI (actions/tracking/payment/timeline) → T7; list badges+filters → T8. Non-goals (customer track, account, email) deferred to OP-2. ✓
- **Placeholder scan:** pure modules + actions carry full code; integration UI tasks name the exact props, the pattern component to mirror, and the download snippet. No TBD.
- **Type consistency:** `OrderStatus`, `canTransition`/`allowedTransitions`/`timestampFieldFor`, `InvoiceData`/`buildInvoiceData`/`generateInvoicePdf`, `AdminOrderDetail`/`AdminOrderListItem` extensions, `OrderHistoryItem`/`getOrderStatusHistory`, action signatures — consistent across tasks. `updateOrderStatus` reworked signature `(orderId, to)` matches its caller `OrderActions` (T7).
- **Load-bearing correctness:** cancel is atomic (inventory restore + status + refund + history in one RPC) with a status guard against double-restore; transitions enforced server-side by the pure workflow even if the UI is bypassed.
