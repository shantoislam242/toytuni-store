-- toytuni-store — fixed-amount (৳ off) coupons, alongside the existing
-- percentage coupons (migration 0017). A coupon now has a `type`:
--   'percent' → uses discount_pct (1–100), as before
--   'fixed'   → uses discount_amount (whole Taka off the subtotal)
--
-- `discount_pct` was NOT NULL with a 1–100 check; fixed coupons don't use it, so
-- the check is relaxed to 0–100 and the default dropped to 0. The app enforces
-- the per-type rule (percent needs 1–100; fixed needs amount ≥ 1). No
-- `place_order` change: the app still computes discount_total + delivery_fee and
-- passes them in; only the amount math changed (subtotal discount, capped).
--
-- Additive + safe to apply before the code deploys (existing percent coupons keep
-- working — `type` defaults to 'percent'). Run in the Supabase SQL editor after
-- 0022_support_threads.sql.

alter table coupons add column if not exists type text not null default 'percent'
  check (type in ('percent','fixed'));
alter table coupons add column if not exists discount_amount int not null default 0
  check (discount_amount >= 0);

-- Relax the old percent-only constraint so a fixed coupon can store discount_pct = 0.
alter table coupons alter column discount_pct set default 0;
alter table coupons drop constraint if exists coupons_discount_pct_check;
alter table coupons add constraint coupons_discount_pct_check
  check (discount_pct between 0 and 100);
