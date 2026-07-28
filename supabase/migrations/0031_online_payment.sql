-- 0031_online_payment.sql — Phase 4: online payment (SSLCommerz).
-- Relaxes the payment_method CHECK to allow 'online', adds gateway bookkeeping
-- columns, and teaches place_order to persist the chosen payment_method (still
-- defaulting to 'cod' so existing callers are unaffected). Apply in the
-- Supabase SQL editor after 0030_product_sku_unique.sql.

-- 1. Allow 'online' alongside 'cod'. The 0001 column-level check is named
--    orders_payment_method_check by Postgres; drop + re-add it widened.
alter table orders drop constraint if exists orders_payment_method_check;
alter table orders add constraint orders_payment_method_check
  check (payment_method in ('cod','online'));

-- 2. Gateway bookkeeping: the validated transaction id (SSLCommerz val_id) and
--    which gateway settled it. Null for COD / unpaid.
alter table orders add column if not exists payment_ref text;
alter table orders add column if not exists payment_gateway text;

-- 3. place_order now persists payment_method (coalesced to 'cod' for old
--    callers that don't send it). The rest of the body is byte-for-byte the
--    0002 version — only the insert column list + values gained payment_method.
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
    subtotal, delivery_fee, total, notes, payment_method
  ) values (
    p_order->>'order_number', v_customer_id,
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_email',
    p_order->>'division', p_order->>'district', p_order->>'area',
    p_order->>'address_line', nullif(p_order->>'landmark', ''),
    (p_order->>'subtotal')::int, (p_order->>'delivery_fee')::int,
    (p_order->>'total')::int, nullif(p_order->>'notes', ''),
    coalesce(p_order->>'payment_method', 'cod')
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
      fulfillment_type, preorder_ship_date
    ) values (
      v_order_id, (v_item->>'product_id')::uuid, v_item->>'title',
      (v_item->>'unit_price')::int, (v_item->>'qty')::int, (v_item->>'line_total')::int,
      v_item->>'fulfillment_type', nullif(v_item->>'preorder_ship_date', '')::date
    );
  end loop;

  return p_order->>'order_number';
end
$$;

revoke execute on function place_order(jsonb, jsonb) from anon, authenticated;
