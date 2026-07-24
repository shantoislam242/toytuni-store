-- toytuni-store — admin-uploadable images for taxonomy (categories + age tiers).
-- Adds an `image_url` to both taxonomy tables so the "Shop by Age" and
-- "By Category" cards can use an admin-uploaded photo (public product-images
-- bucket) instead of only the bundled /public/images/... files. Nullable —
-- when unset the storefront falls back to the bundled image / placeholder.
--
-- Additive + safe to apply BEFORE the code deploys (existing code ignores it).
-- Run in the Supabase SQL editor after 0017_coupons.sql.

alter table categories add column if not exists image_url text;
alter table age_tiers  add column if not exists image_url text;
