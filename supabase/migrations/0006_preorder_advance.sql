-- toytuni-store — Phase 3 Slice 3a: pre-order + advance payment (display-only).
-- Adds an expected-delivery date + per-product advance % to products, an
-- order-level advance_total and a per-line advance % snapshot, and updates
-- place_order to persist them. No money is collected up front yet
-- (payment_method stays 'cod'); advance_total is informational until Phase 4.
-- Run this whole file in the Supabase SQL editor after 0005_catalog_fields.sql.

alter table products add column if not exists preorder_delivery_date date;
alter table products add column if not exists preorder_advance_pct int
  check (preorder_advance_pct is null or (preorder_advance_pct between 0 and 100));
alter table orders add column if not exists advance_total int not null default 0;
alter table order_items add column if not exists preorder_advance_pct int;

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
    subtotal, delivery_fee, total, advance_total, notes
  ) values (
    p_order->>'order_number', v_customer_id,
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_email',
    p_order->>'division', p_order->>'district', p_order->>'area',
    p_order->>'address_line', nullif(p_order->>'landmark', ''),
    (p_order->>'subtotal')::int, (p_order->>'delivery_fee')::int,
    (p_order->>'total')::int, coalesce((p_order->>'advance_total')::int, 0),
    nullif(p_order->>'notes', '')
  ) returning id into v_order_id;

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
