# toytuni-store — Order Process Slice OP-1: Admin fulfillment + invoice

**Date:** 2026-07-19
**Status:** Design approved, pending spec review
**Scope:** The admin-side order lifecycle for a COD, single-vendor, BDT store — a proper status workflow (state machine), courier tracking, COD payment status, inventory restore on cancel, an internal timeline, richer list filters, and a **downloadable / printable PDF invoice**. First of two Order-Process slices (OP-1 admin ✓ → OP-2 customer track + account + email). Precedes the separate Analytics/Dashboard sub-project.

## Background

The admin already has an orders **list** (`src/app/admin/orders/page.tsx` + `orders-table.tsx`, client search by order#/phone) and a **detail** page (`src/app/admin/orders/[id]/page.tsx`) whose only mutation is a status dropdown (`order-status-select.tsx` → `updateOrderStatus(orderId, status)` in `src/lib/admin/actions.ts`). Orders are created by the atomic `place_order` RPC (`src/lib/data/orders.ts` → migration `0006`), which decrements `inventory.stock_qty` for `in_stock` lines. The `orders` table (migration `0001`, extended by `0006`) has: identity/customer/address fields, `status` (pending/confirmed/shipped/delivered/cancelled), `payment_method` (COD-only), `subtotal`/`delivery_fee`/`total`/`advance_total`, `notes`, `created_at`. It has **no** payment status, tracking, per-status timestamps, `updated_at`, or status history, and there is **no invoice/PDF** anywhere. Store branding for an invoice comes from `getSettings()` (`src/lib/data/settings-shape.ts`: `contact.{phone,email,address}`, `brand.tagline`) plus the store name in `@/lib/config`.

## Goals

- **Schema (migration 0011):** add COD `payment_status` + `paid_at`; courier `carrier`/`tracking_number`/`tracking_url`; per-status timestamps `confirmed_at`/`shipped_at`/`delivered_at`/`cancelled_at` + `cancel_reason`; `updated_at` (+ trigger); and an `order_status_history` table (the timeline source).
- **Status workflow** (pure, TDD): a state machine over the existing 5 statuses that says which transitions are legal and which timestamp each sets — the single authority used by both the UI (to show/enable actions) and the server actions (to enforce).
- **Admin order-detail actions:** change status (workflow-gated); on **Ship**, capture carrier + tracking number + optional URL; **Mark as paid** (COD cash collected → `payment_status=paid`, `paid_at`); **Cancel** (reason, sets `cancelled_at`, **restores inventory** for in-stock lines, and if the order was already paid → `payment_status=refunded`); **add an internal note**. Every action appends an `order_status_history` row.
- **Timeline panel** on the detail page rendering `order_status_history` (status, note, who, when).
- **Orders list** gains a payment-status badge + a tracking indicator, and status/payment **filters** (client-side, alongside the existing search).
- **Invoice PDF:** an `@react-pdf/renderer` document (English labels, `৳`/BDT, toytuni branding from settings/config) generated in a Node route handler; the admin detail page gets **Download invoice** + **Print** buttons.

## Non-goals (this slice → OP-2 or later)

- No customer-facing `/track-order`, no logged-in account order view, no email (all **OP-2**). The invoice **engine** is built here and reused there.
- No new order **creation** UI (orders still come from checkout / `place_order`). No editing of line items, quantities, prices, or the shipping address after placement.
- No partial refunds / partial payments — `payment_status` is the three-state `pending | paid | refunded` (COD reality). No payment gateway (still COD-only; Phase 4).
- No SMS. No multi-vendor sub-orders / POS / audit-log (reference-only concepts that don't apply).
- No status renames — we keep `pending/confirmed/shipped/delivered/cancelled` (not the reference's "processing").
- No analytics/charts (separate sub-project).

## Locked decisions

- **Payment:** add `payment_status` (`pending|paid|refunded`) + `paid_at`; admin **Mark as paid**; cancelling a paid order → `refunded`.
- **Invoice:** `@react-pdf/renderer`, **English + ৳**, toytuni branding; admin **Download** + **Print**; engine reusable by OP-2.
- **Tracking:** `carrier` (BD couriers **Pathao / Steadfast / RedX / Sundarban / Paperfly / eCourier / Other** — a select) + `tracking_number` + optional `tracking_url`, captured on Ship.
- **Timeline:** a real `order_status_history` table (cleaner than the reference's audit-log derivation) is the source for the admin timeline (and OP-2's customer tracking).
- **Status set unchanged**; a pure workflow module is the transition authority.
- **Inventory restore on cancel** (atomic, in the DB).

## Schema (migration 0011 — `0011_order_fulfillment.sql`)

```sql
-- Payment (COD): pending until cash collected, then paid; refunded if a paid order is cancelled.
alter table orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','paid','refunded'));
alter table orders add column if not exists paid_at timestamptz;
-- Courier tracking
alter table orders add column if not exists carrier text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
-- Per-status timestamps + cancel reason
alter table orders add column if not exists confirmed_at timestamptz;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists cancelled_at timestamptz;
alter table orders add column if not exists cancel_reason text;
-- Mutation audit
alter table orders add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

-- Timeline: append-only status/note history
create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,            -- the order status at the time of the entry
  note text,                       -- optional (internal note, ship/cancel detail)
  changed_by text,                 -- admin email (or 'system')
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx
  on order_status_history(order_id, created_at);

-- Atomic cancel: restore in-stock inventory + set status/cancelled_at (+refund if paid) + history row.
create or replace function cancel_order(p_order_id uuid, p_reason text, p_changed_by text)
returns void language plpgsql as $$
declare v_was_paid boolean; v_status text;
begin
  select payment_status = 'paid', status into v_was_paid, v_status
    from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  -- Guard: only pending/confirmed can be cancelled — prevents double-restore of inventory.
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

-- RLS: order_status_history is admin/service-role only (no public read in OP-1).
alter table order_status_history enable row level security;
-- (no policies → only service-role bypasses RLS; OP-2 adds any customer-facing access it needs.)
```

Manual step: **apply `0011` in the Supabase SQL editor before merge** (release gate, as with prior slices). Until applied, admin order reads on the new columns fail-soft / actions error — no dev-DB dependency for `tsc`/tests/build.

## Architecture

- **`src/lib/orders/status-workflow.ts`** (pure, TDD): the transition authority.
  - `ORDER_STATUSES = ['pending','confirmed','shipped','delivered','cancelled']`.
  - `ORDER_TRANSITIONS: Record<Status, Status[]>` = `{ pending:['confirmed','cancelled'], confirmed:['shipped','cancelled'], shipped:['delivered'], delivered:[], cancelled:[] }`.
  - `canTransition(from, to): boolean`; `allowedTransitions(status): Status[]`; `timestampFieldFor(status): 'confirmed_at'|'shipped_at'|'delivered_at'|'cancelled_at'|null` (pending→null). Total, deterministic, no `Date`.
- **Types / queries** (`src/lib/admin/queries.ts`): extend `AdminOrderListItem` (`paymentStatus`, `trackingNumber`, `carrier`) and `AdminOrderDetail` (`paymentStatus`, `paidAt`, `carrier`, `trackingNumber`, `trackingUrl`, `confirmedAt`/`shippedAt`/`deliveredAt`/`cancelledAt`, `cancelReason`, `updatedAt`) — add columns to the `.select()` + row types + mappings (new columns absent from generated types → `.overrideTypes`). New `getOrderStatusHistory(orderId): Promise<OrderHistoryItem[]>` (service-role read, oldest-first).
- **Actions** (`src/lib/admin/actions.ts`, all admin-gated + service-role + `revalidatePath('/admin/orders')` + `/admin/orders/:id`):
  - `updateOrderStatus(orderId, to)` — reworked: load current status, `canTransition(current,to)` guard, set `status` + `timestampFieldFor(to)`, append a history row. (Cancel does **not** go here.)
  - `shipOrder(orderId, { carrier, trackingNumber, trackingUrl? })` — guard `confirmed→shipped`, write tracking + `shipped_at`, history row (note = `carrier · trackingNumber`).
  - `markOrderPaid(orderId)` — only when `payment_status='pending'` and status not cancelled → `paid`, `paid_at`, history row.
  - `cancelOrder(orderId, reason)` — calls the `cancel_order` RPC (atomic inventory restore + status + refund + history). Guard: only from `pending`/`confirmed` (workflow), not already cancelled/delivered.
  - `addOrderNote(orderId, note)` — appends a history row (status = current), does not change status.
  - Each action validates input (trim; carrier in the allowed set; note/reason length-bounded) and returns `ActionResult`.
- **Invoice engine** (reused by OP-2):
  - `src/lib/invoice/invoice-document.tsx` — the `@react-pdf/renderer` `Document` (A4, English, `৳`, toytuni header from `brand`/`config`, from/to blocks, items table, subtotal/delivery/advance/total, payment + order status, footer). Types `InvoiceData`, `InvoiceItem`.
  - `src/lib/invoice/build-invoice-data.ts` — `buildInvoiceData(order, settings): InvoiceData` (from = store name/config + `settings.contact`; to = customer + address; status labels from `payment_status`/`status`). Pure.
  - `src/lib/invoice/generate-invoice-pdf.ts` — `generateInvoicePdf(data): Promise<Buffer>` via `renderToBuffer`.
  - **Route** `src/app/admin/orders/[id]/invoice/route.ts` — `export const runtime = 'nodejs'`; admin-gated (`getIsAdmin()` → 403); load order (service-role) + settings; `generateInvoicePdf`; return `new Response(new Uint8Array(buf), { headers: { 'Content-Type':'application/pdf', 'Content-Disposition': 'attachment; filename="invoice-<orderNumber>.pdf"' } })`. (Implementer: read `node_modules/next/dist/docs/` on route-handler + runtime conventions first.)
- **UI:**
  - `src/components/admin/order-actions.tsx` (client) — replaces the bare `OrderStatusSelect` in the detail header: renders the workflow-driven action buttons (Confirm / Ship… / Mark delivered / Cancel…), a **Mark as paid** button, an **Add note** box, and **Download invoice** + **Print** (`window.print()`), each wired to the actions / the invoice route (blob-download pattern). Ship + Cancel open small dialogs.
  - `src/components/admin/order-timeline.tsx` (server-rendered from `getOrderStatusHistory`) — vertical timeline in the detail sidebar.
  - Detail page (`[id]/page.tsx`): add a **payment status** badge + tracking block (carrier · number · link) near the header; mount `OrderActions` + `OrderTimeline`.
  - `src/components/admin/orders-table.tsx`: add a payment-status badge column + a small "tracked" indicator; add status + payment **filter** controls (client-side) beside the search.

## Data flow — fulfil & cancel

1. Admin opens an order (`pending`). Actions show **Confirm** + **Cancel** (from `allowedTransitions('pending')`). Confirm → `updateOrderStatus(id,'confirmed')` sets `confirmed_at`, history row; actions now show **Ship** + **Cancel**.
2. **Ship** dialog captures carrier (select) + tracking number (+ URL) → `shipOrder` writes tracking + `shipped_at` + history. Detail shows the tracking block; actions show **Mark delivered**.
3. On delivery, **Mark delivered** → `delivered_at`, history. **Mark as paid** (any time before cancel) → `paid`, `paid_at`, history.
4. **Cancel** (only from pending/confirmed) → `cancel_order` RPC atomically restores in-stock inventory, sets `cancelled`+`cancelled_at`, flips a paid order to `refunded`, writes history.
5. **Download invoice** any time → the Node route streams the PDF; **Print** uses the browser.

## Security / correctness

- `status-workflow.ts` pure + total (no `Date`, no I/O) → fully unit-testable; it is the single transition authority, mirrored by the DB-level guards where they exist.
- All actions re-check `getIsAdmin()` and use the service-role client; the invoice route is admin-gated (403 otherwise) and Node-runtime.
- **Inventory restore is atomic** in `cancel_order` (single SQL statement joining `order_items`), so a cancel can never double-restore or partially restore; only `in_stock` lines are restored (pre-orders never decremented).
- `updated_at` maintained by a trigger (not app code) so every path is covered.
- New columns/table absent from generated types → `.overrideTypes` reads / `as never` writes / RPC args `as never` (established convention).
- Invoice renders plain text (no untrusted HTML); amounts are integer BDT via the existing `formatTk` conventions inside the PDF.
- `order_status_history` has RLS enabled with no policy in OP-1 (service-role only); OP-2 adds any customer read path deliberately.
- Carrier constrained to the allowed set on write; note/reason length-bounded; transitions rejected server-side even if the UI is bypassed.

## Testing

- **Pure (TDD):** `status-workflow` — `canTransition` for every legal/illegal pair, `allowedTransitions` per status, `timestampFieldFor`; `buildInvoiceData` — from/to/items/totals/status-label mapping, empty/edge (no advance, missing email). 
- **Integration (drive it, real admin session, after migration):** confirm→ship (tracking saved + shown)→deliver; mark-paid (badge + paid_at); cancel a confirmed order → inventory restored (stock back up) + status cancelled + (if paid) refunded + timeline row; add note → timeline row; illegal transition (e.g. delivered→pending) rejected; download invoice → a valid PDF with the right order#, items, totals, ৳, branding; print button opens the print dialog; non-admin hitting the invoice route → 403. Verify against the live DB after 0011.

## Open questions for review

- **Invoice logo:** settings has no logo upload; OP-1 uses a text wordmark (store name + tagline) in the PDF header. Proposal: **text wordmark now**; a logo upload can come with the Analytics/settings work later. (Accept?)
- **Ship without confirm:** the workflow requires `pending→confirmed→shipped`. Some stores ship straight from pending. Proposal: **keep the two-step** (Confirm then Ship) for a clean COD funnel; revisit if you want a one-click "Confirm & ship". (Accept?)
- **`updateOrderStatus` signature change:** it currently takes any status string incl. `cancelled`; OP-1 routes cancel through `cancelOrder` and makes `updateOrderStatus` reject `cancelled`. The old `OrderStatusSelect` component is replaced by `OrderActions`. (Confirm the replacement is fine.)
