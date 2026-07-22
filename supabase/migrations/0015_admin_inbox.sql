-- 0015_admin_inbox.sql — storefront form submissions + newsletter subscribers. Apply in the Supabase SQL editor after 0014_reviews_qa.sql. RLS is enabled with NO policies on purpose: only the service-role (server actions + admin) touches these tables.

create table if not exists form_submissions (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('contact','bulk')),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  meta jsonb,                          -- bulk: { business, program, quantity }
  status text not null default 'new' check (status in ('new','read','archived')),
  created_at timestamptz not null default now()
);
create index if not exists form_submissions_inbox_idx on form_submissions(kind, status, created_at desc);

create table if not exists newsletter_subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  source text not null default 'footer' check (source in ('footer','blog','journal')),
  created_at timestamptz not null default now()
);

-- RLS on, NO policies: the public can neither read nor write directly —
-- all access goes through server actions (service-role).
alter table form_submissions enable row level security;
alter table newsletter_subscribers enable row level security;
