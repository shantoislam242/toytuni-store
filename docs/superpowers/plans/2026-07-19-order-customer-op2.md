# Order Customer OP-2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give customers a public order-tracking page + a logged-in account order-detail view, and send Resend transactional email on placed/shipped/delivered/cancelled — reusing the OP-1 invoice engine and status timeline.

**Architecture:** Pure helpers (phone-match, tracking-steps, email templates) are TDD-covered. A fail-soft Resend email module fires from `createOrder` (placed + invoice PDF) and the OP-1 admin actions (shipped/delivered/cancelled), only ever to `customer_email`, never breaking the order flow. Customer reads are service-role but ownership-verified server-side (session email for account; order#+phone for public track). A shared stepper renders the timeline from `order_status_history`.

**Tech Stack:** Next.js 16.2.9 (App Router, `src/proxy.ts`), Supabase (service-role), `resend`, `@react-pdf/renderer` (OP-1 engine), vitest (TDD), Tailwind (cream/ink).

## Global Constraints

- Next.js is **non-standard (v16)** — before writing route handlers / server actions / runtime config, read the relevant guide in `node_modules/next/dist/docs/`. `params` is a Promise (`await params`). Middleware is `src/proxy.ts`.
- **No new migration** — OP-1's 0011 (payment/tracking/timestamps/`order_status_history`) is sufficient. `order_status_history` RLS stays service-role-only; all customer reads verify ownership in server code BEFORE reading via `createAdminSupabase()`.
- **Email is fail-soft and side-effect-only:** every send is wrapped in try/catch, logs on error, returns `void`, and NEVER rethrows into `createOrder` or an admin action. A missing `RESEND_API_KEY` or absent `customer_email` → silent no-op. `RESEND_API_KEY` is server-only (never `NEXT_PUBLIC`). Sender = `process.env.RESEND_FROM` (fallback `"onboarding@resend.dev"`).
- Money is integer BDT; format with `formatTk` from `@/lib/format` (renders `Tk 1,234`). Dates with `formatDate`.
- Reuse the OP-1 invoice engine: `buildInvoiceData` (`@/lib/invoice/build-invoice-data`, structural param types) + `generateInvoicePdf` (`@/lib/invoice/generate-invoice-pdf`). `BRAND_NAME` from `@/lib/config`.
- New columns absent from generated types → `.overrideTypes<Row[],{merge:false}>()` reads. Service-role client = `createAdminSupabase()` (`server-only`). Session = `getSessionUser()` (`@/lib/auth/session`, returns a user with `.email`).
- Pure logic is TDD. Run `npx tsc --noEmit && npx vitest run && npm run build` before each commit; clean/green/ok.
- Do NOT `git add` `.env.local` or `.superpowers/`.
- Status vocabulary (from OP-1 `@/lib/orders/status-workflow`): `pending | confirmed | shipped | delivered | cancelled`.

---

### Task 1: Pure helpers — phone match + tracking steps (TDD)

**Files:**
- Create: `src/lib/orders/phone-match.ts` (+ `.test.ts`), `src/lib/orders/tracking-steps.ts` (+ `.test.ts`)

**Interfaces:**
- Produces: `normalizePhone(raw: string): string`; `phoneMatches(a: string, b: string): boolean`; `type TrackStep = { key: 'placed'|'confirmed'|'shipped'|'delivered'|'cancelled'; label: string; state: 'done'|'active'|'todo' }`; `buildTrackingSteps(status: string, historyStatuses: string[]): TrackStep[]`.

- [ ] **Step 1: Write the failing test — phone-match**

```ts
// src/lib/orders/phone-match.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone, phoneMatches } from "./phone-match";

describe("normalizePhone", () => {
  it("strips spaces, dashes, plus", () => {
    expect(normalizePhone("+880 1712-345678")).toBe("01712345678");
    expect(normalizePhone("01712 345 678")).toBe("01712345678");
  });
  it("collapses the 88 country prefix to local 01…", () => {
    expect(normalizePhone("8801712345678")).toBe("01712345678");
    expect(normalizePhone("+8801712345678")).toBe("01712345678");
  });
  it("leaves an already-local number", () => {
    expect(normalizePhone("01712345678")).toBe("01712345678");
  });
});
describe("phoneMatches", () => {
  it("matches across formats", () => {
    expect(phoneMatches("+8801712345678", "01712 345678")).toBe(true);
    expect(phoneMatches("01712345678", "8801712345678")).toBe(true);
  });
  it("rejects different numbers", () => {
    expect(phoneMatches("01712345678", "01998765432")).toBe(false);
  });
  it("is false on empty", () => {
    expect(phoneMatches("", "01712345678")).toBe(false);
  });
});
```

- [ ] **Step 2: Run → fail** (`npx vitest run src/lib/orders/phone-match.test.ts`).

- [ ] **Step 3: Implement `phone-match.ts`**

```ts
// src/lib/orders/phone-match.ts
/** Reduce a BD phone to canonical local form: digits only, `880…`→`0…`. */
export function normalizePhone(raw: string): string {
  let d = (raw ?? "").replace(/\D+/g, "");
  if (d.startsWith("880")) d = "0" + d.slice(3);
  return d;
}
/** True iff two phones are the same number; tolerant to the last 10 digits. */
export function phoneMatches(a: string, b: string): boolean {
  const na = normalizePhone(a), nb = normalizePhone(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.slice(-10), tb = nb.slice(-10);
  return ta.length === 10 && ta === tb;
}
```

- [ ] **Step 4: Run → pass.**

- [ ] **Step 5: Write the failing test — tracking-steps**

```ts
// src/lib/orders/tracking-steps.test.ts
import { describe, it, expect } from "vitest";
import { buildTrackingSteps } from "./tracking-steps";

describe("buildTrackingSteps", () => {
  it("marks placed active for a fresh pending order", () => {
    const s = buildTrackingSteps("pending", ["pending"]);
    expect(s.map((x) => x.key)).toEqual(["placed", "confirmed", "shipped", "delivered"]);
    expect(s[0].state).toBe("active");
    expect(s[1].state).toBe("todo");
  });
  it("marks progress through shipped", () => {
    const s = buildTrackingSteps("shipped", ["pending", "confirmed", "shipped"]);
    expect(s[0].state).toBe("done");
    expect(s[1].state).toBe("done");
    expect(s[2].state).toBe("active");
    expect(s[3].state).toBe("todo");
  });
  it("marks delivered all done", () => {
    const s = buildTrackingSteps("delivered", ["pending", "confirmed", "shipped", "delivered"]);
    expect(s.every((x) => x.state === "done")).toBe(true);
  });
  it("returns a single cancelled terminal step for a cancelled order", () => {
    const s = buildTrackingSteps("cancelled", ["pending", "cancelled"]);
    expect(s.map((x) => x.key)).toEqual(["placed", "cancelled"]);
    expect(s[1].state).toBe("done");
  });
});
```

- [ ] **Step 6: Run → fail.**

- [ ] **Step 7: Implement `tracking-steps.ts`**

```ts
// src/lib/orders/tracking-steps.ts
export type TrackStep = {
  key: "placed" | "confirmed" | "shipped" | "delivered" | "cancelled";
  label: string;
  state: "done" | "active" | "todo";
};

const FLOW: { key: TrackStep["key"]; label: string; status: string }[] = [
  { key: "placed", label: "Placed", status: "pending" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "shipped", label: "Shipped", status: "shipped" },
  { key: "delivered", label: "Delivered", status: "delivered" },
];

export function buildTrackingSteps(status: string, historyStatuses: string[]): TrackStep[] {
  if (status === "cancelled") {
    return [
      { key: "placed", label: "Placed", state: "done" },
      { key: "cancelled", label: "Cancelled", state: "done" },
    ];
  }
  const reached = new Set(historyStatuses);
  reached.add("pending"); // every order was placed
  const currentIdx = FLOW.findIndex((f) => f.status === status);
  return FLOW.map((f, i) => ({
    key: f.key,
    label: f.label,
    state: i < currentIdx ? "done" : i === currentIdx ? "active" : reached.has(f.status) ? "done" : "todo",
  }));
}
```

- [ ] **Step 8: Run → pass.**

- [ ] **Step 9: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`
```bash
git add src/lib/orders/phone-match.ts src/lib/orders/phone-match.test.ts src/lib/orders/tracking-steps.ts src/lib/orders/tracking-steps.test.ts
git commit -m "feat(orders): pure phone-match + tracking-steps helpers (TDD)"
```

---

### Task 2: Email module — Resend client + templates (TDD) + fail-soft sender

**Files:**
- Modify: `package.json` (add `resend`)
- Create: `src/lib/email/resend-client.ts`, `src/lib/email/order-email-templates.ts` (+ `.test.ts`), `src/lib/email/send-order-email.ts`

**Interfaces:**
- Produces: `type OrderEmailKind = 'placed'|'shipped'|'delivered'|'cancelled'`; `type OrderEmailData = { orderNumber: string; customerName: string; customerEmail: string; status: string; items: { title: string; qty: number; lineTotal: number }[]; subtotal: number; deliveryFee: number; advanceTotal: number; total: number; carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null }`; `renderOrderEmail(kind, data): { subject: string; html: string }`; `getResend(): Resend | null`; `sendOrderEmail(kind, data, attachInvoice?: { filename: string; content: Buffer }): Promise<void>` (fail-soft).

- [ ] **Step 1: Add the dependency** — `npm install resend`. Commit lockfile with this task.

- [ ] **Step 2: Write the failing test — templates**

```ts
// src/lib/email/order-email-templates.test.ts
import { describe, it, expect } from "vitest";
import { renderOrderEmail } from "./order-email-templates";

const base = {
  orderNumber: "TT-ABC", customerName: "Rima", customerEmail: "r@x.com", status: "pending",
  items: [{ title: "Blocks", qty: 2, lineTotal: 1000 }],
  subtotal: 1000, deliveryFee: 80, advanceTotal: 0, total: 1080,
};

describe("renderOrderEmail", () => {
  it("placed: subject + order number + Tk total, no undefined", () => {
    const { subject, html } = renderOrderEmail("placed", base);
    expect(subject).toContain("TT-ABC");
    expect(html).toContain("Tk 1,080");
    expect(html).toContain("Blocks");
    expect(html).not.toMatch(/undefined|NaN/);
  });
  it("shipped: includes carrier + tracking when present", () => {
    const { subject, html } = renderOrderEmail("shipped", { ...base, status: "shipped", carrier: "Pathao", trackingNumber: "TN1" });
    expect(subject.toLowerCase()).toContain("shipped");
    expect(html).toContain("Pathao");
    expect(html).toContain("TN1");
  });
  it("delivered + cancelled have distinct subjects", () => {
    expect(renderOrderEmail("delivered", { ...base, status: "delivered" }).subject.toLowerCase()).toContain("delivered");
    expect(renderOrderEmail("cancelled", { ...base, status: "cancelled" }).subject.toLowerCase()).toContain("cancel");
  });
});
```

- [ ] **Step 3: Run → fail.**

- [ ] **Step 4: Implement `order-email-templates.ts`** (pure — English, `Tk` via `formatTk`, Toytuni header, order#, items, totals; tracking block only for `shipped`). Use `BRAND_NAME` from `@/lib/config`. Each kind returns `{ subject, html }`. Keep HTML as plain inline-styled strings (no template lib). Example skeleton (fill all four kinds):

```ts
// src/lib/email/order-email-templates.ts
import { formatTk } from "@/lib/format";
import { BRAND_NAME } from "@/lib/config";

export type OrderEmailKind = "placed" | "shipped" | "delivered" | "cancelled";
export type OrderEmailData = {
  orderNumber: string; customerName: string; customerEmail: string; status: string;
  items: { title: string; qty: number; lineTotal: number }[];
  subtotal: number; deliveryFee: number; advanceTotal: number; total: number;
  carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null;
};

const HEADING: Record<OrderEmailKind, string> = {
  placed: "Thank you for your order!",
  shipped: "Your order is on the way",
  delivered: "Your order was delivered",
  cancelled: "Your order was cancelled",
};
const SUBJECT: Record<OrderEmailKind, (o: OrderEmailData) => string> = {
  placed: (o) => `${BRAND_NAME} — order ${o.orderNumber} confirmed`,
  shipped: (o) => `${BRAND_NAME} — order ${o.orderNumber} shipped`,
  delivered: (o) => `${BRAND_NAME} — order ${o.orderNumber} delivered`,
  cancelled: (o) => `${BRAND_NAME} — order ${o.orderNumber} cancelled`,
};

function itemsRows(o: OrderEmailData): string {
  return o.items.map((i) => `<tr><td>${i.title} × ${i.qty}</td><td align="right">${formatTk(i.lineTotal)}</td></tr>`).join("");
}
function trackingBlock(o: OrderEmailData): string {
  if (!o.trackingNumber) return "";
  const carrier = o.carrier ?? "Courier";
  const line = `${carrier} · ${o.trackingNumber}`;
  const linked = o.trackingUrl ? `<a href="${o.trackingUrl}">${line}</a>` : line;
  return `<p><strong>Tracking:</strong> ${linked}</p>`;
}

export function renderOrderEmail(kind: OrderEmailKind, o: OrderEmailData): { subject: string; html: string } {
  const totals = `
    <table width="100%"><tr><td>Subtotal</td><td align="right">${formatTk(o.subtotal)}</td></tr>
    <tr><td>Delivery</td><td align="right">${formatTk(o.deliveryFee)}</td></tr>
    ${o.advanceTotal > 0 ? `<tr><td>Advance</td><td align="right">${formatTk(o.advanceTotal)}</td></tr>` : ""}
    <tr><td><strong>Total</strong></td><td align="right"><strong>${formatTk(o.total)}</strong></td></tr></table>`;
  const html = `<div style="font-family:sans-serif;max-width:560px;margin:auto">
    <h2>${BRAND_NAME}</h2>
    <h3>${HEADING[kind]}</h3>
    <p>Hi ${o.customerName}, order <strong>${o.orderNumber}</strong>.</p>
    ${kind === "shipped" ? trackingBlock(o) : ""}
    <table width="100%">${itemsRows(o)}</table>
    ${totals}
    <p style="color:#888;font-size:12px">This is a Cash-on-Delivery order.</p>
  </div>`;
  return { subject: SUBJECT[kind](o), html };
}
```

- [ ] **Step 5: Run → pass.**

- [ ] **Step 6: Implement `resend-client.ts`** (lazy, null when unset):

```ts
// src/lib/email/resend-client.ts
import "server-only";
import { Resend } from "resend";

let cached: Resend | null | undefined;
export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new Resend(key) : null;
  return cached;
}
export const EMAIL_FROM = process.env.RESEND_FROM || "onboarding@resend.dev";
```

- [ ] **Step 7: Implement `send-order-email.ts`** (fail-soft):

```ts
// src/lib/email/send-order-email.ts
import "server-only";
import { getResend, EMAIL_FROM } from "./resend-client";
import { renderOrderEmail, type OrderEmailKind, type OrderEmailData } from "./order-email-templates";

export async function sendOrderEmail(
  kind: OrderEmailKind, data: OrderEmailData,
  attachInvoice?: { filename: string; content: Buffer },
): Promise<void> {
  try {
    const resend = getResend();
    if (!resend || !data.customerEmail) return; // no key / no recipient → no-op
    const { subject, html } = renderOrderEmail(kind, data);
    await resend.emails.send({
      from: EMAIL_FROM, to: data.customerEmail, subject, html,
      attachments: attachInvoice ? [{ filename: attachInvoice.filename, content: attachInvoice.content }] : undefined,
    });
  } catch (err) {
    console.error(`sendOrderEmail(${kind}) failed for ${data.orderNumber}:`, err);
  }
}
```

- [ ] **Step 8: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add package.json package-lock.json src/lib/email/
git commit -m "feat(email): Resend order-email module + templates (TDD, fail-soft)"
```

---

### Task 3: Wire email into order placement + admin actions

**Files:**
- Modify: `src/lib/data/orders.ts` (placed), `src/lib/admin/actions.ts` (shipped/delivered/cancelled)

**Interfaces:**
- Consumes: `sendOrderEmail` + `OrderEmailData` (Task 2); `getSettings` + invoice engine (OP-1); `getAdminOrderById` (queries).

- [ ] **Step 1: Placed email in `createOrder`.** After the successful `place_order` RPC (right before `return { ok: true, ... }`), if `input.customer.email`, build the `OrderEmailData` from the in-memory data + `p_items`, generate the invoice PDF from the same data, and fire fail-soft:

```ts
if (input.customer.email) {
  const emailData = {
    orderNumber, customerName: input.customer.name, customerEmail: input.customer.email,
    status: "pending",
    items: p_items.map((i) => ({ title: i.title, qty: i.qty, lineTotal: i.line_total })),
    subtotal, deliveryFee, advanceTotal, total,
  };
  try {
    const settings = await getSettings();
    const invoiceData = buildInvoiceData(
      { orderNumber, createdAt: new Date().toISOString(), status: "pending", paymentStatus: "pending",
        customerName: input.customer.name, customerPhone: input.customer.phone, customerEmail: input.customer.email,
        division: input.address.division, district: input.address.district, area: input.address.area,
        addressLine: input.address.addressLine, landmark: input.address.landmark ?? null,
        items: p_items.map((i) => ({ title: i.title, qty: i.qty, unitPrice: i.unit_price, lineTotal: i.line_total })),
        subtotal, deliveryFee, advanceTotal, total },
      settings, BRAND_NAME,
    );
    const pdf = await generateInvoicePdf(invoiceData);
    await sendOrderEmail("placed", emailData, { filename: `invoice-${orderNumber}.pdf`, content: pdf });
  } catch (err) {
    console.error("placed-email failed:", err);
  }
}
```
Add the imports (`sendOrderEmail`, `getSettings`, `buildInvoiceData`, `generateInvoicePdf`, `BRAND_NAME`). Note: `createOrder` must NOT `await` in a way that can throw — the inner try/catch + `sendOrderEmail`'s own fail-soft guarantee the order still returns `{ ok:true }`. (Do NOT use `new Date()` inside anything TDD-tested — this is runtime app code, so it's fine here.)

- [ ] **Step 2: Shipped/delivered/cancelled emails in `actions.ts`.** Add a fail-soft helper and call it after each successful mutation (after the DB write, before `return { ok:true }`):

```ts
async function emailOrder(orderId: string, kind: "shipped" | "delivered" | "cancelled") {
  try {
    const order = await getAdminOrderById(orderId);
    if (!order?.customerEmail) return;
    await sendOrderEmail(kind, {
      orderNumber: order.orderNumber, customerName: order.customerName, customerEmail: order.customerEmail,
      status: order.status,
      items: order.items.map((i) => ({ title: i.title, qty: i.qty, lineTotal: i.lineTotal })),
      subtotal: order.subtotal, deliveryFee: order.deliveryFee, advanceTotal: order.advanceTotal, total: order.total,
      carrier: order.carrier, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl,
    });
  } catch (err) { console.error(`emailOrder(${kind}) failed:`, err); }
}
```
Wire: in `shipOrder` after success → `await emailOrder(orderId, "shipped")`; in `updateOrderStatus` when `to === "delivered"` after success → `await emailOrder(orderId, "delivered")`; in `cancelOrder` after the RPC succeeds → `await emailOrder(orderId, "cancelled")`. Import `sendOrderEmail` + `getAdminOrderById`.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add src/lib/data/orders.ts src/lib/admin/actions.ts
git commit -m "feat(email): send order email on placed/shipped/delivered/cancelled"
```

---

### Task 4: Account data layer — detail reader + extended fields

**Files:**
- Modify: `src/lib/data/account.ts`

**Interfaces:**
- Produces: `AccountOrder` (list) gains `paymentStatus`, `trackingNumber`, `carrier`; `type AccountOrderDetail = AccountOrder & { customerPhone: string; customerEmail: string | null; division: string; district: string; area: string; addressLine: string; landmark: string | null; paymentStatus: string; carrier: string | null; trackingNumber: string | null; trackingUrl: string | null; deliveryFee: number; advanceTotal: number; subtotal: number; historyStatuses: string[]; items: (AccountOrderItem & { unitPrice: number })[] }`; `getOrderForEmail(email: string, orderNumber: string): Promise<AccountOrderDetail | null>`.

- [ ] **Step 1: Extend the list read** `getOrdersForEmail`: add `payment_status, tracking_number, carrier` to `.select` and map onto `AccountOrder` (`paymentStatus`, `trackingNumber`, `carrier`).

- [ ] **Step 2: Add `getOrderForEmail`** — service-role, scoped to BOTH email + order number, returns null if not found (so a wrong owner gets nothing). Read the order (full fields + items) and, separately, its `order_status_history` statuses (oldest-first) for `historyStatuses`.

```ts
export async function getOrderForEmail(email: string, orderNumber: string): Promise<AccountOrderDetail | null> {
  const db = createAdminSupabase();
  const { data, error } = await db
    .from("orders")
    .select("order_number, created_at, status, payment_status, carrier, tracking_number, tracking_url, customer_phone, customer_email, division, district, area, address_line, landmark, subtotal, delivery_fee, advance_total, total, order_items(title, qty, unit_price, line_total, fulfillment_type)")
    .eq("customer_email", email).eq("order_number", orderNumber)
    .maybeSingle()
    .overrideTypes</* row type */ any, { merge: false }>();
  if (error || !data) { if (error) console.error("getOrderForEmail failed:", error); return null; }
  const { data: hist } = await db
    .from("order_status_history").select("status").eq("order_id", /* need id */ "").order("created_at", { ascending: true });
  // NOTE: orders row above doesn't select id; add `id` to the select and use it here.
  // ...map to AccountOrderDetail (camelCase; historyStatuses = (hist ?? []).map(h => h.status))...
}
```
Implementer: add `id` to the orders `.select` so the history query can filter by `order_id`. Give the row an explicit local row type (not `any`) matching the select, per the repo's `.overrideTypes` convention. Map all fields to camelCase; `historyStatuses` from the history rows.

- [ ] **Step 3: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run`
```bash
git add src/lib/data/account.ts
git commit -m "feat(account): order-detail reader + tracking/payment fields"
```

---

### Task 5: Shared stepper + account order-detail page + account invoice route

**Files:**
- Create: `src/components/orders/order-timeline-stepper.tsx`, `src/app/account/orders/[orderNumber]/page.tsx`, `src/app/account/orders/[orderNumber]/invoice/route.ts`
- Modify: the account order list component (link each order to its detail route) — find it under `src/components/account/` (e.g. the list rendered by `AccountView`).

**Interfaces:**
- Consumes: `buildTrackingSteps` + `TrackStep` (Task 1), `getOrderForEmail` (Task 4), `getSessionUser`, invoice engine + `getSettings` + `getAdminOrderById`? No — account invoice must be email-scoped: reuse `getOrderForEmail` then `buildInvoiceData`.

- [ ] **Step 1: Build `order-timeline-stepper.tsx`** (server component, presentational). Props `{ steps: TrackStep[] }`. Render a horizontal (or vertical on mobile) stepper: a node per step (done = filled/check, active = ring, todo = muted) + label, connected by a line; cancelled step styled distinctly. Cream/ink palette. No client state.

- [ ] **Step 2: Build the account detail page** `src/app/account/orders/[orderNumber]/page.tsx` (server):
```tsx
export default async function Page({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await getSessionUser();
  if (!user?.email) redirect(`/signin?next=/account/orders/${orderNumber}`);
  const order = await getOrderForEmail(user.email, orderNumber);
  if (!order) notFound();
  const steps = buildTrackingSteps(order.status, order.historyStatuses);
  // render: order#, date, stepper, tracking block (carrier·number, linked), items + totals, Download invoice button (client blob-fetch to ./invoice)
}
```
Include a small client "Download invoice" button (blob-fetch `/account/orders/${orderNumber}/invoice`, `res.ok` guarded — mirror the OP-1 pattern) — extract a tiny client component or reuse a shared `InvoiceDownloadButton`.

- [ ] **Step 3: Build the account invoice route** `src/app/account/orders/[orderNumber]/invoice/route.ts` (`runtime = "nodejs"`): `getSessionUser()` → 401 if none; `getOrderForEmail(email, orderNumber)` → 404 if null; `getSettings()`; `buildInvoiceData(order, settings, BRAND_NAME)`; `generateInvoicePdf`; stream PDF with the `attachment` header. (Note: `getOrderForEmail`'s `AccountOrderDetail` must expose every field `buildInvoiceData` reads — it does after Task 4: orderNumber, createdAt, status, paymentStatus, customer*, address parts, items{title,qty,unitPrice,lineTotal}, subtotal/deliveryFee/advanceTotal/total.)

- [ ] **Step 4: Link the list → detail.** In the account order list component, wrap each order row/card in a `Link` to `/account/orders/${orderNumber}`.

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add src/components/orders/order-timeline-stepper.tsx "src/app/account/orders/[orderNumber]/" src/components/account/
git commit -m "feat(account): order-detail page with timeline + invoice download"
```

---

### Task 6: Public track-order — action + page + form + invoice route

**Files:**
- Create: `src/lib/orders/track-actions.ts`, `src/app/track-order/page.tsx`, `src/components/orders/track-order-form.tsx`, `src/app/track-order/invoice/route.ts`
- Maybe modify: a nav/footer link to `/track-order` (optional — check `src/components/layout/` for a footer links list).

**Interfaces:**
- Consumes: `phoneMatches` (Task 1), `buildTrackingSteps` (Task 1), the stepper (Task 5), `createAdminSupabase`, invoice engine + `getSettings`.
- Produces: `trackOrder(input: { orderNumber: string; phone: string }): Promise<{ ok: true; order: PublicOrderView } | { ok: false; error: string }>`; `type PublicOrderView` (order#, date, status, steps, masked customer name, tracking, items, totals).

- [ ] **Step 1: Build `track-actions.ts`** (`"use server"`). A shared `findVerifiedOrder(orderNumber, phone)` (service-role: fetch order by `order_number` incl. `id`, `customer_phone`, all display fields + items; `phoneMatches` gate; return the row or null) used by both the action and the invoice route. `trackOrder` calls it, and on hit fetches `order_status_history` statuses, builds `PublicOrderView` (mask the customer name — e.g. first name + initial), returns `{ ok:true, order }`; on miss returns `{ ok:false, error: "We couldn't find an order with those details." }`. Add a **best-effort in-memory per-IP throttle** (a module-level `Map<ip, timestamps[]>`, e.g. max 10/min) — read the IP from headers (`x-forwarded-for`); document in a comment that this is best-effort in serverless and the order#+phone pair is the real credential.

- [ ] **Step 2: Build the form** `src/components/orders/track-order-form.tsx` (client): order-number + phone inputs → calls `trackOrder` (via `useTransition`/action), renders `{ok:false}` error inline, and on success renders the stepper + tracking + items/totals + a Download-invoice button (blob-fetch `POST /track-order/invoice` with `{orderNumber, phone}` in the body, `res.ok` guarded).

- [ ] **Step 3: Build the page** `src/app/track-order/page.tsx` (public server component): a heading + intro + `<TrackOrderForm />`. Add `generateMetadata` (`title: "Track your order"`, indexable).

- [ ] **Step 4: Build the invoice route** `src/app/track-order/invoice/route.ts` (`POST`, `runtime = "nodejs"`): parse `{ orderNumber, phone }` from the body, `findVerifiedOrder(...)` → 404 on miss (same throttle), `getSettings()`, `buildInvoiceData`, `generateInvoicePdf`, stream the PDF. (Re-verifies ownership every time — never trust the client.)

- [ ] **Step 5: Verify + commit**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
```bash
git add src/lib/orders/track-actions.ts "src/app/track-order/" src/components/orders/track-order-form.tsx
git commit -m "feat(orders): public track-order page + verified invoice download"
```

---

## Final Verification

- [ ] `npx vitest run` green; `npx tsc --noEmit && npm run build` clean.
- [ ] No new migration (0011 covers it). Set the per-branch Supabase + Resend preview env vars if the preview reports missing vars.
- [ ] End-to-end (real data, admin + a test order with an email = your Resend account email):
  - Place an order with an email → confirmation email + invoice PDF lands in the Resend inbox (test mode); order still succeeds if `RESEND_API_KEY` is unset.
  - Admin ship/deliver/cancel → the matching email fires (fail-soft).
  - Public `/track-order` with the right order#+phone → stepper + tracking + invoice; wrong phone / unknown order → generic not-found; invoice route re-verifies.
  - Account: `/account/orders/[orderNumber]` for the signed-in owner → timeline + tracking + invoice; another user's order → 404; invoice route 401/404 on bad ownership.
- [ ] Opus whole-branch review, then finish branch (PR to `master`; preview env + green).

## Self-Review

- **Spec coverage:** phone-match + tracking-steps → T1; email module/templates → T2; email hooks (placed+invoice / shipped / delivered / cancelled) → T3; account detail reader → T4; account detail page + stepper + account invoice → T5; public track + invoice → T6. Non-goals (SMS, domain verify, profile editing, RLS change) excluded. ✓
- **Placeholder scan:** pure modules carry full code; T4/T5/T6 name exact files, signatures, the select strings, the ownership gates, and the reused engine. One deliberate `/* need id */` note in T4 Step 2 is called out with the fix instruction (add `id` to the select) — not a placeholder left for the implementer to invent.
- **Type consistency:** `normalizePhone`/`phoneMatches`, `TrackStep`/`buildTrackingSteps`, `OrderEmailKind`/`OrderEmailData`/`renderOrderEmail`/`sendOrderEmail`, `AccountOrderDetail`/`getOrderForEmail`, `PublicOrderView`/`trackOrder`/`findVerifiedOrder` — consistent across tasks. Email data shape (`items` with `lineTotal`) matches what `createOrder` and `getAdminOrderById` provide.
- **Load-bearing security:** every customer read verifies ownership BEFORE the service-role read (session email for account; order#+phone for track); invoice routes re-verify; email is fail-soft + `customer_email`-only + server-only key. `order_status_history` RLS unchanged.
