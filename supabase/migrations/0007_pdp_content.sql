-- toytuni-store — Phase 3 Slice 3b: editable PDP content.
-- detail_content = editable editorial (features/benefits/why-how play/return policy/
-- specs/delivery estimate/video); gallery_urls = ordered PDP gallery images.
-- Both null/empty => the app falls back to the mock ProductDetail.
-- Run in the Supabase SQL editor after 0006_preorder_advance.sql, then re-seed.

alter table products add column if not exists detail_content jsonb;
alter table products add column if not exists gallery_urls text[];
