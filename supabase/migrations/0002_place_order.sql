-- toytuni-store — Phase 1 addendum: atomic order placement.
-- Wraps customer upsert + order insert + per-line stock decrement + order_items
-- insert in ONE transaction (a plpgsql function is transactional: any RAISE rolls
-- the whole thing back). This removes the stock-leak / orphan-order risk of doing
-- those as separate calls from the app.
--
-- The app still re-reads price/stock and decides each line's fulfillment_type
-- (in_stock vs preorder) before calling this; the guarded decrement here is the
-- authoritative final check and RAISEs (rolling back) if stock ran out in a race.
--
-- Run this whole file in the Supabase SQL editor after 0001_init.sql.

create or replace function place_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_item jsonb;
begin
  -- Upsert customer by phone (groups repeat buyers).
  insert into customers (phone, name, email)
    values (p_order->>'customer_phone', p_order->>'customer_name', p_order->>'customer_email')
    on conflict (phone) do update set name = excluded.name, email = excluded.email
    returning id into v_customer_id;

  insert into orders (
    order_number, customer_id, customer_name, customer_phone, customer_email,
    division, district, area, address_line, landmark,
    subtotal, delivery_fee, total, notes
  ) values (
    p_order->>'order_number', v_customer_id,
    p_order->>'customer_name', p_order->>'customer_phone', p_order->>'customer_email',
    p_order->>'division', p_order->>'district', p_order->>'area',
    p_order->>'address_line', nullif(p_order->>'landmark', ''),
    (p_order->>'subtotal')::int, (p_order->>'delivery_fee')::int,
    (p_order->>'total')::int, nullif(p_order->>'notes', '')
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    -- Reserve stock only for in-stock lines; guarded so it never goes negative.
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

-- Defense-in-depth: these functions are only meant to be called by the
-- service-role client (which bypasses grants). Revoke direct EXECUTE from the
-- public-facing roles so a leaked anon key cannot invoke them.
revoke execute on function place_order(jsonb, jsonb) from anon, authenticated;
revoke execute on function decrement_stock(uuid, int) from anon, authenticated;
