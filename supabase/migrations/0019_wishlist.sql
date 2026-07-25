-- toytuni-store — per-user wishlist (Phase 2 of the customer account dashboard).
-- Signed-in customers' saved products persist server-side (synced across
-- devices) instead of only in the browser's localStorage. Signed-out visitors
-- keep the localStorage-only behavior; on sign-in the local list is merged in.
--
-- One row per (user, product slug). Slug (not product id) mirrors how the
-- storefront wishlist already keys items, and survives a product row being
-- re-created. RLS: zero-policy — every read/write goes through the
-- service-role client in server actions, scoped to the session user id, the
-- same pattern used across this repo (coupons, admin_users, ...).
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0018_taxonomy_image.sql.

create table if not exists wishlist_items (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  product_slug text        not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, product_slug)
);

-- List a user's wishlist newest-or-oldest-first without a full scan.
create index if not exists wishlist_items_user_created_idx
  on wishlist_items (user_id, created_at);

alter table wishlist_items enable row level security;
-- No policies: service-role only (bypasses RLS); anon/authenticated clients
-- get nothing, so the table is never exposed to the browser directly.
