-- toytuni-store — order returns + refunds (admin).
-- Adds a 'returned' order status reachable from 'delivered', processed atomically
-- by return_order() (mirrors cancel_order): it restocks the in-stock lines,
-- refunds a paid order, and records a status-history row. A separate admin
-- action marks a paid order refunded without a return.
--
-- Also re-creates the three analytics functions that summed revenue over
-- `status <> 'cancelled'` so a returned (refunded) order no longer counts as
-- revenue: order_timeseries, top_products, customer_stats.
--
-- Additive (existing statuses unchanged). Run in the Supabase SQL editor after
-- 0024_coupon_free_shipping.sql.

-- 1. Allow the new terminal status.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pending','confirmed','shipped','delivered','cancelled','returned'));

-- 2. Return + refund metadata.
alter table orders add column if not exists returned_at   timestamptz;
alter table orders add column if not exists return_reason text;
alter table orders add column if not exists refunded_at   timestamptz;

-- 3. Atomic return: delivered → returned, restock in-stock lines, refund if paid.
create or replace function return_order(p_order_id uuid, p_reason text, p_changed_by text)
returns void language plpgsql as $$
declare v_was_paid boolean; v_status text;
begin
  select payment_status = 'paid', status into v_was_paid, v_status
    from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_status <> 'delivered' then
    raise exception 'cannot_return_from:%', v_status;
  end if;

  -- Restock, aggregated by product (an order may have >1 in_stock line per product).
  update inventory i set stock_qty = i.stock_qty + agg.qty
    from (
      select product_id, sum(qty) as qty
      from order_items
      where order_id = p_order_id and fulfillment_type = 'in_stock'
      group by product_id
    ) agg
    where i.product_id = agg.product_id;

  update orders set
    status = 'returned', returned_at = now(), return_reason = nullif(p_reason,''),
    payment_status = case when v_was_paid then 'refunded'  else payment_status end,
    refunded_at    = case when v_was_paid then now()       else refunded_at    end
    where id = p_order_id;

  insert into order_status_history (order_id, status, note, changed_by)
    values (p_order_id, 'returned', nullif(p_reason,''), p_changed_by);
end $$;
revoke execute on function return_order(uuid, text, text) from public, anon, authenticated;

-- 4. Exclude 'returned' (as well as 'cancelled') from revenue aggregates.
create or replace function order_timeseries(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table(bucket timestamptz, orders bigint, revenue bigint)
language sql stable as $$
  select date_trunc(p_bucket, created_at) as bucket,
         count(*)::bigint as orders,
         coalesce(sum(total) filter (where status not in ('cancelled','returned')), 0)::bigint as revenue
  from orders
  where created_at >= p_from and created_at < p_to
  group by 1 order by 1;
$$;
revoke execute on function order_timeseries(timestamptz, timestamptz, text) from public, anon, authenticated;

create or replace function top_products(p_from timestamptz, p_to timestamptz, p_limit int)
returns table(product_id uuid, title text, qty bigint, revenue bigint)
language sql stable as $$
  select oi.product_id, min(oi.title) as title,
         sum(oi.qty)::bigint as qty, sum(oi.line_total)::bigint as revenue
  from order_items oi join orders o on o.id = oi.order_id
  where o.created_at >= p_from and o.created_at < p_to and o.status not in ('cancelled','returned')
  group by oi.product_id
  order by revenue desc limit p_limit;
$$;
revoke execute on function top_products(timestamptz, timestamptz, int) from public, anon, authenticated;

create or replace function customer_stats(p_from timestamptz, p_to timestamptz)
returns table(new_customers bigint, aov numeric, repeat_customers bigint)
language sql stable as $$
  select
    (select count(*)::bigint from customers c where c.created_at >= p_from and c.created_at < p_to),
    (select coalesce(avg(total), 0) from orders where created_at >= p_from and created_at < p_to and status not in ('cancelled','returned')),
    (select count(*)::bigint from (
       select customer_id from orders
       where created_at >= p_from and created_at < p_to and customer_id is not null
       group by customer_id having count(*) > 1
     ) r);
$$;
revoke execute on function customer_stats(timestamptz, timestamptz) from public, anon, authenticated;
