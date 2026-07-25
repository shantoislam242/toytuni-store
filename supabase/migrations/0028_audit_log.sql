-- toytuni-store — admin audit log. Records who changed what (order status,
-- settings, team/roles, product create/deactivate, coupons). Written fail-soft
-- by `logAudit` after a successful mutation; read at /admin/audit (super-admin).
-- RLS zero-policy — service-role only, like the other admin tables.
--
-- Additive + safe to apply before the code deploys. Run in the Supabase SQL
-- editor after 0027_policy_pages.sql. Uses uuid_generate_v4() (already present).

create table if not exists audit_log (
  id          uuid        primary key default uuid_generate_v4(),
  actor_email text        not null,          -- who did it (session email, or 'system')
  action      text        not null,          -- e.g. 'order.ship', 'team.add'
  entity      text        not null,          -- e.g. 'order', 'settings', 'admin_user'
  entity_id   text,                          -- the affected id/slug/email (nullable)
  summary     text        not null,          -- human-readable one-liner
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_created_idx on audit_log (created_at desc);

alter table audit_log enable row level security;
-- No policies: service-role only.
