-- 0016_admin_roles.sql — dashboard-managed admin roles. Apply after 0015_admin_inbox.sql. RLS zero-policy: service-role only. Env ADMIN_EMAILS stays the lockout-proof bootstrap (those emails are always super admins regardless of this table).

create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  role text not null default 'admin' check (role in ('super_admin','admin')),
  added_by text,
  created_at timestamptz not null default now()
);
alter table admin_users enable row level security;  -- zero policies: service-role only

insert into admin_users (email, role, added_by) values
  ('work.databrandix11@gmail.com', 'super_admin', 'seed'),
  ('dbx.project01@gmail.com', 'super_admin', 'seed'),
  ('nabidahamed18@gmail.com', 'super_admin', 'seed')
on conflict (email) do nothing;
