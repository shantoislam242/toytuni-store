-- Phase 3 Slice 2: catalog-in-DB. Gift-kit contents + category/age-tier presentation.
alter table products  add column if not exists kit_contents jsonb;
alter table categories add column if not exists tone text;
alter table categories add column if not exists tagline text;
alter table age_tiers  add column if not exists tone text;
alter table age_tiers  add column if not exists tagline text;
