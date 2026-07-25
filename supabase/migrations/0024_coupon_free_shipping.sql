-- toytuni-store — free-shipping coupon type, alongside percent (0017) and fixed
-- (0023). A 'free_shipping' coupon waives the delivery fee instead of discounting
-- the subtotal (discount_total stays 0; the app zeroes delivery_fee when the
-- coupon applies and the order meets the coupon's minimum).
--
-- Only widens the `type` check constraint; no data change. No `place_order`
-- change — the app still computes delivery_fee (now possibly 0) + discount_total
-- and passes them in.
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0023_coupon_fixed_amount.sql.

alter table coupons drop constraint if exists coupons_type_check;
alter table coupons add constraint coupons_type_check
  check (type in ('percent','fixed','free_shipping'));
