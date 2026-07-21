-- 0013_customer_profile.sql — admin customer CRM fields.
-- Apply in the Supabase SQL editor after 0012_analytics_functions.sql.
alter table customers add column if not exists status text not null default 'active'
  check (status in ('active','inactive','blocked'));
alter table customers add column if not exists tags text[];
alter table customers add column if not exists notes text;
alter table customers add column if not exists updated_at timestamptz not null default now();

-- set_updated_at() already exists (migration 0011). Attach the trigger to customers.
drop trigger if exists customers_set_updated_at on customers;
create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
