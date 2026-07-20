-- 0012_analytics_functions.sql — read-only order/sales aggregation for the admin
-- dashboard + analytics page. All stable, execute revoked from anon/authenticated
-- (called only via the service-role client behind the admin gate).
-- Apply in the Supabase SQL editor after 0011_order_fulfillment.sql.
-- `revoke ... from public` removes the implicit CREATE-time PUBLIC execute grant
-- (revoking only anon/authenticated would leave PUBLIC intact). date_trunc() buckets
-- in the DB session timezone — Supabase runs UTC, matching the JS-side getUTC* keys.

create or replace function order_timeseries(p_from timestamptz, p_to timestamptz, p_bucket text)
returns table(bucket timestamptz, orders bigint, revenue bigint)
language sql stable as $$
  select date_trunc(p_bucket, created_at) as bucket,
         count(*)::bigint as orders,
         coalesce(sum(total) filter (where status <> 'cancelled'), 0)::bigint as revenue
  from orders
  where created_at >= p_from and created_at < p_to
  group by 1 order by 1;
$$;
revoke execute on function order_timeseries(timestamptz, timestamptz, text) from public, anon, authenticated;

create or replace function status_breakdown(p_from timestamptz, p_to timestamptz)
returns table(status text, count bigint)
language sql stable as $$
  select status, count(*)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by status order by 2 desc;
$$;
revoke execute on function status_breakdown(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function payment_breakdown(p_from timestamptz, p_to timestamptz)
returns table(payment_status text, count bigint, amount bigint)
language sql stable as $$
  select payment_status, count(*)::bigint,
         coalesce(sum(total), 0)::bigint from orders
  where created_at >= p_from and created_at < p_to
  group by payment_status order by 2 desc;
$$;
revoke execute on function payment_breakdown(timestamptz, timestamptz) from public, anon, authenticated;

create or replace function top_products(p_from timestamptz, p_to timestamptz, p_limit int)
returns table(product_id uuid, title text, qty bigint, revenue bigint)
language sql stable as $$
  select oi.product_id, min(oi.title) as title,
         sum(oi.qty)::bigint as qty, sum(oi.line_total)::bigint as revenue
  from order_items oi join orders o on o.id = oi.order_id
  where o.created_at >= p_from and o.created_at < p_to and o.status <> 'cancelled'
  group by oi.product_id
  order by revenue desc limit p_limit;
$$;
revoke execute on function top_products(timestamptz, timestamptz, int) from public, anon, authenticated;

create or replace function customer_stats(p_from timestamptz, p_to timestamptz)
returns table(new_customers bigint, aov numeric, repeat_customers bigint)
language sql stable as $$
  select
    (select count(*)::bigint from customers c where c.created_at >= p_from and c.created_at < p_to),
    (select coalesce(avg(total), 0) from orders where created_at >= p_from and created_at < p_to and status <> 'cancelled'),
    (select count(*)::bigint from (
       select customer_id from orders
       where created_at >= p_from and created_at < p_to and customer_id is not null
       group by customer_id having count(*) > 1
     ) r);
$$;
revoke execute on function customer_stats(timestamptz, timestamptz) from public, anon, authenticated;
