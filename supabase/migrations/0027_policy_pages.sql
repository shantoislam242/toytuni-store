-- toytuni-store — admin-editable policy pages (CMS).
-- The premium policy pages (Returns/Refund, Privacy, Terms, Warranty, Cookies,
-- Bulk-orders) were hardcoded `PolicyContent` modules in src/lib/policy/*. This
-- lets the admin edit them at /admin/content/policies. Each row stores the full
-- structured `PolicyContent` as jsonb; the storefront reads DB-or-hardcoded
-- (the module registry is the fail-soft default, so NO seed is needed — the
-- editor form starts from the current default and the first save persists it).
--
-- The bespoke policy views (shipping, safety-standards, sustainability) are NOT
-- part of this table — they stay custom components.
--
-- Public read (all rows are public policy pages); admin writes via the
-- service-role client. Additive + safe to apply before the code deploys. Run in
-- the Supabase SQL editor after 0026_faqs.sql.

create table if not exists policy_pages (
  slug       text        primary key,
  content    jsonb       not null,
  updated_at timestamptz not null default now()
);

alter table policy_pages enable row level security;
drop policy if exists "read policy_pages" on policy_pages;
create policy "read policy_pages" on policy_pages for select using (true);
