# toytuni-store — Order Process Slice OP-2: Customer tracking + account view + email

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** The customer-facing half of the order process — a **public `/track-order`** page (order number + phone, no login), a **logged-in account order-detail** view (timeline + tracking + invoice), and **transactional email** via Resend on order **placed / shipped / delivered / cancelled** (placed carries the invoice PDF). Reuses the OP-1 invoice engine + `order_status_history`. Second and final Order-Process slice (OP-1 admin fulfillment ✓ → **OP-2 customer + email**). The Analytics/Dashboard sub-project follows.

## Background

OP-1 (merged, PR #14/#15) gave the admin the full fulfillment surface: migration 0011 added `payment_status`, courier tracking (`carrier`/`tracking_number`/`tracking_url`), per-status timestamps, and an `order_status_history` timeline table + `cancel_order` RPC; a pure `status-workflow` module is the transition authority; an `@react-pdf/renderer` invoice engine (`src/lib/invoice/`, English + `Tk`) powers an admin download route; admin actions (`updateOrderStatus`/`shipOrder`/`markOrderPaid`/`cancelOrder`/`addOrderNote`) each append a history row. On the customer side today: `src/app/account/page.tsx` shows a signed-in user's order **list** via `getOrdersForEmail(email)` (`src/lib/data/account.ts`, service-role, scoped to the session email) — but no per-order detail, no tracking, no invoice, no public tracking, and **no email at all** (`createOrder` in `src/lib/data/orders.ts` just returns after the `place_order` RPC). Resend is configured (`RESEND_API_KEY`, `RESEND_FROM=onboarding@resend.dev`) in **test mode** — until a domain is verified, Resend only delivers to the account owner's own email; the code is written env-driven + fail-soft so verifying a domain later is a `RESEND_FROM` swap with no code change.

## Goals

- **Public `/track-order`:** a page with an order-number + phone form → a server action verifies the phone matches the order → renders a status **timeline stepper** + tracking (carrier · number · link) + item/total summary + an **invoice download**. No login. Rate-limited (best-effort) with a generic "order not found" on any miss (no enumeration).
- **Account order detail:** `/account/orders/[orderNumber]` (session-gated, scoped to the signed-in user's email) — the same timeline + tracking + invoice download for a logged-in customer; the account page's order list links to it.
- **Transactional email (Resend, fail-soft, env-driven `from`):** send on **placed** (confirmation + **invoice PDF attached**), **shipped** (carrier + tracking), **delivered** (thank-you), **cancelled**. English, Toytuni-branded, `Tk` amounts. Only ever sent to the order's `customer_email` (when present). An email failure NEVER breaks the order/action.
- **Reuse, don't duplicate:** the OP-1 invoice engine (`buildInvoiceData`/`generateInvoicePdf`) backs both the new customer invoice routes and the placed-email attachment; a shared customer **timeline stepper** component serves track + account.

## Non-goals (this slice / later)

- No SMS (Bangladesh SMS is a separate provider + slice). No push/WhatsApp.
- No domain verification work — test-mode Resend now; real customer delivery is a later `RESEND_FROM`/DNS step (documented), no code change.
- No account **profile editing**, addresses book, re-order, or cancellation-by-customer (customer cannot mutate the order; tracking is read-only).
- No per-tag/return/refund customer flows. No order editing.
- No change to `order_status_history` RLS — it stays service-role-only; customer reads go through server code that verifies ownership first (session email, or order#+phone), exactly like `getOrdersForEmail` already does.
- No analytics (separate sub-project).

## Locked decisions

- **Track auth = order number + phone** (the two together are the credential); service-role read after verification; generic not-found on mismatch; best-effort per-IP throttle.
- **Account auth = session email scoping** (reuse the established `getOrdersForEmail` pattern).
- **Email = Resend, fail-soft, env `from`**, on placed(+invoice)/shipped/delivered/cancelled; only to `customer_email`.
- **Invoice reuse** — customer + public + email all call the OP-1 engine; two new ownership-verifying routes (account-scoped, track-scoped).
- **Shared timeline stepper** derived from `order_status_history` (+ the order's status), reused by track + account.

## Architecture

- **Email module `src/lib/email/`:**
  - `resend-client.ts` — a thin lazy `getResend()` returning a `Resend` instance from `RESEND_API_KEY` (or `null` when unset → email becomes a no-op, so dev without a key still works).
  - `send-order-email.ts` — `sendOrderEmail(kind, order, opts?)` where `kind ∈ 'placed'|'shipped'|'delivered'|'cancelled'`; builds subject + HTML from a template, `from = RESEND_FROM`, `to = order.customerEmail`; on `placed`, attaches the invoice PDF (`generateInvoicePdf(buildInvoiceData(order, settings, BRAND_NAME))`). **Fail-soft:** wrapped in try/catch, returns `void`, logs on error; a null client or missing `customerEmail` → silent no-op. Never throws.
  - `order-email-templates.ts` — pure functions `(order) => { subject, html }` per kind (English, `Tk` via `formatTk`, Toytuni header, order#, items, totals, tracking block on shipped). No external template lib — plain HTML strings (keeps it dependency-light and testable).
- **Email hooks (all fail-soft, awaited but never rethrow):**
  - `src/lib/data/orders.ts` `createOrder`: after a successful `place_order`, if `customer.email`, fire `sendOrderEmail('placed', …)`. Build the order shape from what `createOrder` already has (order number, customer, items, totals) — no extra DB round-trip needed for the email body; the invoice attachment reuses the same data.
  - `src/lib/admin/actions.ts`: `shipOrder` → `'shipped'`; `updateOrderStatus(...,'delivered')` → `'delivered'`; `cancelOrder` → `'cancelled'`. Each loads the order (via `getAdminOrderById`) after the successful mutation and fires the email fail-soft.
- **Pure helpers (TDD):**
  - `src/lib/orders/phone-match.ts` — `normalizePhone(raw): string` (strip spaces/dashes/`+`, keep digits; collapse a leading `88` country code to the local `01…` form) + `phoneMatches(a, b): boolean` (compare normalized, last-10-digit tolerant). Used by track verification.
  - `src/lib/orders/tracking-steps.ts` — `buildTrackingSteps(status, history): Step[]` mapping the workflow to an ordered stepper (`Placed → Confirmed → Shipped → Delivered`, or a `Cancelled` terminal), marking each done/active from `history` + `status`. Pure, reused by the stepper UI.
- **Public track:**
  - `src/app/track-order/page.tsx` (public) + `src/components/orders/track-order-form.tsx` (client) → server action `trackOrder({ orderNumber, phone })` in `src/lib/orders/track-actions.ts` (`"use server"`): best-effort per-IP throttle, service-role lookup by `order_number`, verify `phoneMatches(order.customer_phone, phone)`, on success return a `PublicOrderView` (summary + `buildTrackingSteps` + tracking + masked customer name); on any miss return `{ ok:false }` with a generic message.
  - `src/app/track-order/invoice/route.ts` — `POST` (order# + phone in body), Node runtime, verify like `trackOrder`, then stream the PDF (reusing the engine). Rate-limited.
- **Account:**
  - Extend `src/lib/data/account.ts`: `AccountOrder` gains `status` (already), `paymentStatus`, `carrier`, `trackingNumber`, `trackingUrl`; add `getOrderForEmail(email, orderNumber): Promise<AccountOrderDetail | null>` (service-role, `.eq('customer_email',email).eq('order_number',orderNumber)`) + its `order_status_history` (service-role) for the timeline.
  - `src/app/account/orders/[orderNumber]/page.tsx` (server, session-gated: `getSessionUser()` → 404/redirect if not owner) → renders the shared stepper + tracking + items + `Download invoice`.
  - `src/app/account/orders/[orderNumber]/invoice/route.ts` — `GET`, Node runtime, session-gated + email-scoped, streams the PDF.
  - The account order list (`components/account/*`) links each order to its detail route.
- **Shared UI:** `src/components/orders/order-timeline-stepper.tsx` (from `buildTrackingSteps`) + a small tracking block; used by both `/track-order` and `/account/orders/[orderNumber]`. Cream/ink palette. The invoice download uses the same blob-fetch pattern as OP-1 (`res.ok` guarded).

## Data flow — track an order

1. Customer opens `/track-order`, enters order# + phone → `trackOrder(...)`.
2. Server (service-role) finds the order by `order_number`; `phoneMatches` gate. Miss → generic "We couldn't find an order with those details."
3. Hit → returns summary + `buildTrackingSteps(status, history)` + tracking. The page renders the stepper (Placed→…→Delivered / Cancelled), the carrier·number (linked if `tracking_url`), items, total, and a **Download invoice** button → `POST /track-order/invoice` (re-verifies) → PDF.

## Data flow — order placed email

1. `createOrder` succeeds (`place_order` RPC returns the order number).
2. If `customer.email` present → `sendOrderEmail('placed', order, { settings })`: builds the confirmation HTML + attaches `generateInvoicePdf(...)`; `resend.emails.send({ from: RESEND_FROM, to: customerEmail, subject, html, attachments:[{filename, content}] })`.
3. Any failure (no key, Resend error, test-mode recipient restriction) is caught + logged; `createOrder` still returns `{ ok:true }`. (In test mode only the Resend account owner's address actually receives it — documented.)

## Security / correctness

- **Track:** order# + phone is the credential; verification is server-side via service-role; a mismatch/absent order returns an identical generic message (no existence enumeration). Best-effort per-IP throttle on the action + invoice route (in-memory; documented as best-effort in serverless — the order#+phone secret is the real guard). Customer name is masked in the public view.
- **Account:** every read is scoped to `getSessionUser().email` server-side; the detail route + invoice route 404 when the order's `customer_email` ≠ the session email. Service-role reads never reach the client.
- **`order_status_history` stays service-role-only** (OP-1 RLS unchanged); customer timelines are assembled server-side after ownership is proven.
- **Email is fail-soft and side-effect-only** — it can never break `createOrder` or an admin action; it only ever targets `customer_email`; secrets (`RESEND_API_KEY`) stay server-side (never `NEXT_PUBLIC`).
- **Invoice routes** are Node-runtime, verify ownership before streaming, and reuse the audited OP-1 engine (no null/NaN, plain-text).
- Pure helpers (`normalizePhone`/`phoneMatches`/`buildTrackingSteps`, templates) are TDD-covered and total.

## Testing

- **Pure (TDD):** `normalizePhone`/`phoneMatches` (spaces/dashes/`+88`/leading-zero variants, mismatch); `buildTrackingSteps` (each status → correct done/active steps; cancelled terminal; missing history); email templates (subject + key content per kind, `Tk` formatting, tracking block only on shipped, no `undefined`/`NaN`).
- **Integration (drive it, real data, after any migration — none needed here):** track a real order with the right phone → stepper + tracking + invoice; wrong phone / unknown order → generic not-found; account detail for the signed-in user → timeline + invoice; another user's order → 404; place an order with an email → a confirmation email with the invoice PDF lands in the Resend account inbox (test mode); ship/deliver/cancel → the matching email fires; missing `RESEND_API_KEY` → order still succeeds (no-op email). Verify invoice routes 403/404 on bad ownership.

## Open questions for review

- **Rate-limiting depth:** in-memory per-IP throttle is per-serverless-instance (weak). Proposal: **ship the in-memory best-effort throttle + rely on order#+phone as the real credential**; a durable limiter (a Supabase table or Upstash) is a later hardening if abuse appears. (Accept?)
- **Placed-email order shape:** `createOrder` builds the invoice/email from its in-memory order data (no post-insert re-read) to avoid a round-trip. Acceptable, or prefer re-reading via `getAdminOrderById` for a single source? Proposal: **use the in-memory data** (it's exactly what was persisted). (Accept?)
- **Account list source:** extend the existing `getOrdersForEmail` (list) with the new fields, and add a separate `getOrderForEmail` (detail). Fine, or fold detail into the list read? Proposal: **separate detail reader** (only the opened order needs history + full fields). (Accept?)
