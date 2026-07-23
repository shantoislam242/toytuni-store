-- toytuni-store — Coupon / discount codes.
-- Admin-managed percentage coupons; a customer applies a code at checkout and
-- the discount is subtracted from the order total. Optional per-coupon
-- constraints (expiry, minimum subtotal, total usage limit) are all nullable /
-- zero-default, so a bare `code + %` coupon works too.
--
-- `place_order` is re-created as a SUPERSET of the 0006 version: it additionally
-- persists coupon_code + discount_total on the order, and — when a coupon_code
-- is present — does a guarded used_count increment in the SAME transaction
-- (atomic + race-safe, mirroring the per-line stock guard).
--
-- Run this whole file in the Supabase SQL editor after 0016_admin_roles.sql.

create table if not exists coupons (
  id uuid primary key default uuid_generate_v4(),
  code text not null unique,                 -- stored UPPERCASE (normalized by the app)
  discount_pct int not null check (discount_pct between 1 and 100),
  active boolean not null default true,
  min_subtotal int not null default 0 check (min_subtotal >= 0),   -- 0 = no minimum
  expires_at timestamptz,                     -- null = never expires
  usage_limit int check (usage_limit is null or usage_limit > 0),  -- null = unlimited
  used_count int not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Zero RLS policies: only the service-role client (admin actions + checkout's
-- server-side apply/validate) can read or write coupons; anon/authenticated
-- cannot reach the table directly.
alter table coupons enable row level security;

alter table orders add column if not exists coupon_code text;
alter table orders add column if not exists discount_total int not null default 0;

create or replace function place_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
begin
  insert into customers (phone, name, email)
    values (p_order->>'customer_phone', p_order->>'customer_name', p_order->>'customer_email')
    on conflict (phone) do update set name = excluded.name, email = excluded.email
    returning id into v_customer_id;

  insert into orders (
    order_number, customer_id, customer_name, customer_phone, customer_email,
    division, district, area, address_line, landmark,
    subtotal, delivery_fee, total, advance_total, discount_total, coupon_code, notes
  ) values (
    p_order->>'order_number', v_customer_id,
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_email',
    p_order->>'division', p_order->>'district', p_order->>'area',
    p_order->>'address_line', nullif(p_order->>'landmark', ''),
    (p_order->>'subtotal')::int, (p_order->>'delivery_fee')::int,
    (p_order->>'total')::int, coalesce((p_order->>'advance_total')::int, 0),
    coalesce((p_order->>'discount_total')::int, 0), nullif(p_order->>'coupon_code', ''),
    nullif(p_order->>'notes', '')
  ) returning id into v_order_id;

  -- Consume the coupon in the same transaction. The guard re-checks active /
  -- expiry / usage-limit at commit time so a coupon can't be over-redeemed in a
  -- race; a failure rolls the whole order back (same pattern as the stock guard).
  if nullif(p_order->>'coupon_code', '') is not null then
    update coupons
      set used_count = used_count + 1, updated_at = now()
      where upper(code) = upper(p_order->>'coupon_code')
        and active
        and (expires_at is null or expires_at > now())
        and (usage_limit is null or used_count < usage_limit);
    if not found then
      raise exception 'coupon_unavailable:%', p_order->>'coupon_code';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    if v_item->>'fulfillment_type' = 'in_stock' then
      update inventory
        set stock_qty = stock_qty - (v_item->>'qty')::int
        where product_id = (v_item->>'product_id')::uuid
          and stock_qty >= (v_item->>'qty')::int;
      if not found then
        raise exception 'insufficient_stock:%', v_item->>'product_id';
      end if;
    end if;

    insert into order_items (
      order_id, product_id, title, unit_price, qty, line_total,
      fulfillment_type, preorder_ship_date, preorder_advance_pct
    ) values (
      v_order_id, (v_item->>'product_id')::uuid, v_item->>'title',
      (v_item->>'unit_price')::int, (v_item->>'qty')::int, (v_item->>'line_total')::int,
      v_item->>'fulfillment_type', nullif(v_item->>'preorder_ship_date', '')::date,
      nullif(v_item->>'preorder_advance_pct', '')::int
    );
  end loop;

  return p_order->>'order_number';
end
$$;

revoke execute on function place_order(jsonb, jsonb) from anon, authenticated;
