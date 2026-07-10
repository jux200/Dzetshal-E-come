-- Dzetshal Sprint 6.1: cancelled-order business rules
-- Applies consistent revenue, dispatch, workflow and inventory restoration rules.

alter table orders
  add column if not exists cancellation_stock_restored boolean not null default false;

-- Restore stock exactly once when an order becomes cancelled/refunded,
-- and prevent reopening a terminal order.
create or replace function enforce_order_terminal_and_restore_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_status text := lower(coalesce(old.status, 'pending'));
  new_status text := lower(coalesce(new.status, 'pending'));
  rec record;
  before_qty integer;
  after_qty integer;
begin
  -- Cancelled/refunded orders are terminal.
  if old_status in ('cancelled','canceled','refunded')
     and new_status not in ('cancelled','canceled','refunded') then
    raise exception 'A cancelled or refunded order cannot be reopened.';
  end if;

  if new_status in ('cancelled','canceled','refunded')
     and coalesce(old.cancellation_stock_restored, false) = false then

    for rec in
      select
        oi.product_id,
        max(coalesce(oi.product_name, p.name)) as product_name,
        max(coalesce(oi.brand, p.brand)) as brand,
        sum(greatest(coalesce(oi.quantity, 0), 0))::integer as qty
      from order_items oi
      left join products p on p.id = oi.product_id
      where oi.order_id = new.id
        and oi.product_id is not null
      group by oi.product_id
    loop
      select coalesce(stock,0)
      into before_qty
      from products
      where id = rec.product_id
      for update;

      if found and rec.qty > 0 then
        after_qty := before_qty + rec.qty;

        update products
        set stock = after_qty
        where id = rec.product_id;

        insert into inventory_history(
          product_id, product_name, brand, change_amount,
          quantity_before, quantity_after, reason, note,
          changed_by, order_id
        )
        values(
          rec.product_id, rec.product_name, rec.brand, rec.qty,
          before_qty, after_qty, 'cancellation_restore',
          'Stock restored after order cancellation',
          coalesce(auth.email(),'system'), new.id
        );
      end if;
    end loop;

    new.cancellation_stock_restored := true;
    new.delivery_status := 'cancelled';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_order_terminal_and_restore_stock on orders;
create trigger trg_enforce_order_terminal_and_restore_stock
before update of status on orders
for each row
execute function enforce_order_terminal_and_restore_stock();

-- Backfill existing cancelled/refunded orders once.
-- Updating status to itself intentionally invokes the trigger.
update orders
set status = status
where lower(coalesce(status,'')) in ('cancelled','canceled','refunded')
  and coalesce(cancellation_stock_restored,false) = false;

-- Useful indexes for analytics and dispatch.
create index if not exists orders_status_idx on orders(status);
create index if not exists orders_payment_status_idx on orders(payment_status);
create index if not exists orders_delivery_status_idx on orders(delivery_status);
create index if not exists orders_created_at_idx on orders(created_at);
