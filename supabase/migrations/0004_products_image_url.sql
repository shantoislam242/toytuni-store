-- Phase 3 admin: admin-uploaded product images (Supabase Storage) URL.
-- Existing products keep resolving images from public/images/products/<slug>/;
-- when image_url is set, the storefront prefers it.
alter table products add column if not exists image_url text;
