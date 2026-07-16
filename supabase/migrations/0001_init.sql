-- toytuni-store — Backend Phase 1 initial schema.
-- Run this whole file in the Supabase SQL editor (or `supabase db push`).
-- Creates 10 tables, an atomic stock-decrement function, and RLS policies.

create extension if not exists "uuid-ossp";

-- ── Catalog ────────────────────────────────────────────────────────────────
create table categories (
  slug text primary key,
  title text not null,
  sort int not null default 0
);

create table age_tiers (
  slug text primary key,
  title text not null,
  sort int not null default 0
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  sku text not null,
  title text not null,
  price int not null check (price >= 0),
  compare_at_price int check (compare_at_price >= 0),
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  age_tier_slug text references age_tiers(slug),
  category_slug text references categories(slug),
  badge text check (badge in ('New','Best Seller','Limited')),
  description text,
  image_label text,
  image_tones text[] not null default '{}',
  preorder_ship_date date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  tone text not null
);

create table inventory (
  product_id uuid primary key references products(id) on delete cascade,
  stock_qty int not null default 0,
  low_stock_threshold int not null default 5
);

-- ── Customer + orders ───────────────────────────────────────────────────────
create table customers (
  id uuid primary key default uuid_generate_v4(),
  phone text unique not null,
  name text not null,
  email text,
  auth_user_id uuid,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default uuid_generate_v4(),
  order_number text unique not null,
  customer_id uuid references customers(id),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  division text not null,
  district text not null,
  area text not null,
  address_line text not null,
  landmark text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','shipped','delivered','cancelled')),
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  subtotal int not null,
  delivery_fee int not null default 0,
  total int not null,
  notes text,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id),
  title text not null,
  unit_price int not null,
  qty int not null check (qty > 0),
  line_total int not null,
  fulfillment_type text not null check (fulfillment_type in ('in_stock','preorder')),
  preorder_ship_date date
);

-- ── Content + settings ──────────────────────────────────────────────────────
create table blog_posts (
  slug text primary key,
  title text not null,
  excerpt text,
  body jsonb not null default '[]',
  author text,
  cover_image text,
  category text,
  read_mins int,
  date_iso date,
  featured boolean not null default false,
  published boolean not null default true
);

create table site_settings (
  key text primary key,
  value jsonb not null
);

-- ── Atomic stock decrement ──────────────────────────────────────────────────
-- Decrements stock only if enough is available; returns remaining qty, or -1
-- if insufficient (caller then falls back to pre-order / sold-out).
create or replace function decrement_stock(p_product_id uuid, p_qty int)
returns int language plpgsql as $$
declare remaining int;
begin
  update inventory set stock_qty = stock_qty - p_qty
    where product_id = p_product_id and stock_qty >= p_qty
    returning stock_qty into remaining;
  if not found then return -1; end if;
  return remaining;
end $$;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- Public reads on catalog/content (active/published only). No anon policy on
-- orders / order_items / customers → the anon key cannot read them at all.
-- All writes go through the service-role key, which bypasses RLS.
alter table products         enable row level security;
alter table product_variants enable row level security;
alter table categories       enable row level security;
alter table age_tiers        enable row level security;
alter table inventory        enable row level security;
alter table blog_posts       enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table customers        enable row level security;
alter table site_settings    enable row level security;

create policy "read active products" on products         for select using (active = true);
create policy "read variants"        on product_variants for select using (true);
create policy "read categories"      on categories       for select using (true);
create policy "read age_tiers"       on age_tiers        for select using (true);
create policy "read inventory"       on inventory        for select using (true);
create policy "read published posts" on blog_posts       for select using (published = true);
create policy "read settings"        on site_settings    for select using (true);
