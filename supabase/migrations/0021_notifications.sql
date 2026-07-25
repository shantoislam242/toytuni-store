-- toytuni-store — customer notifications (Phase 5 of the account dashboard).
-- An in-app notification feed for signed-in customers: order-status updates are
-- written here automatically when an admin advances/ships/cancels/settles an
-- order, and the customer reads/archives them at /account/notifications.
--
-- Keyed by `customer_email` (NOT a user id) to match how orders are matched to
-- a customer everywhere else in this app (orders carry no user link — see the
-- account data layer). The signed-in visitor's session email is the scope.
-- RLS: zero-policy — every read/write goes through the service-role client in
-- server code, scoped to the session email (same pattern as coupons / wishlist
-- / addresses).
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0020_customer_addresses.sql. Uses uuid_generate_v4() (already
-- present).

create table if not exists notifications (
  id             uuid        primary key default uuid_generate_v4(),
  customer_email text        not null,
  type           text        not null default 'order',  -- 'order' | 'system'
  title          text        not null,
  body           text,
  order_number   text,       -- optional deep-link target (→ /account/orders/…)
  read_at        timestamptz,
  archived_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Feed query: a customer's newest, non-archived notifications.
create index if not exists notifications_email_created_idx
  on notifications (customer_email, created_at desc);

alter table notifications enable row level security;
-- No policies: service-role only (bypasses RLS); the browser never reads the
-- table directly.
