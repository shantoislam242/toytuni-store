-- 0011_order_fulfillment.sql — OP-1 admin fulfillment: payment status, courier tracking,
-- per-status timestamps, updated_at trigger, status-history timeline, atomic cancel+restore.
-- Apply in the Supabase SQL editor after 0010_blog_extras.sql.

alter table orders add column if not exists payment_status text not null default 'pending'
  check (payment_status in ('pending','paid','refunded'));
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists carrier text;
alter table orders add column if not exists tracking_number text;
alter table orders add column if not exists tracking_url text;
alter table orders add column if not exists confirmed_at timestamptz;
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists cancelled_at timestamptz;
alter table orders add column if not exists cancel_reason text;
alter table orders add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

create table if not exists order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  note text,
  changed_by text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx
  on order_status_history(order_id, created_at);

create or replace function cancel_order(p_order_id uuid, p_reason text, p_changed_by text)
returns void language plpgsql as $$
declare v_was_paid boolean; v_status text;
begin
  select payment_status = 'paid', status into v_was_paid, v_status
    from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_status not in ('pending','confirmed') then
    raise exception 'cannot_cancel_from:%', v_status;
  end if;

  -- Aggregate by product first: a set-based join would restock a product only once
  -- even if the order has two in_stock lines for it, whereas place_order decremented per line.
  update inventory i set stock_qty = i.stock_qty + agg.qty
    from (
      select product_id, sum(qty) as qty
      from order_items
      where order_id = p_order_id and fulfillment_type = 'in_stock'
      group by product_id
    ) agg
    where i.product_id = agg.product_id;

  update orders set
    status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(p_reason,''),
    payment_status = case when v_was_paid then 'refunded' else payment_status end
    where id = p_order_id;

  insert into order_status_history (order_id, status, note, changed_by)
    values (p_order_id, 'cancelled', nullif(p_reason,''), p_changed_by);
end $$;
revoke execute on function cancel_order(uuid, text, text) from anon, authenticated;

alter table order_status_history enable row level security;
