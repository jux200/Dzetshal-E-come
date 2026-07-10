-- Dzetshal Sprint 3: Orders, status history, notes, and inventory tracking

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  product_id uuid references products(id),
  product_name text,
  brand text,
  size text,
  quantity integer not null default 1,
  unit_price numeric not null default 0,
  line_total numeric not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  status text not null,
  changed_by text,
  created_at timestamp with time zone default now()
);

create table if not exists order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamp with time zone default now()
);

create table if not exists inventory_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  product_name text,
  brand text,
  change_amount integer not null default 0,
  quantity_before integer,
  quantity_after integer,
  reason text default 'manual',
  note text,
  changed_by text,
  order_id uuid references orders(id) on delete set null,
  created_at timestamp with time zone default now()
);

alter table orders add column if not exists payment_status text default 'Pending';
alter table orders add column if not exists delivery_status text default 'Pending';
alter table orders add column if not exists notes text;
alter table orders add column if not exists updated_at timestamp with time zone default now();

alter table order_items enable row level security;
alter table order_status_history enable row level security;
alter table order_notes enable row level security;
alter table inventory_history enable row level security;

-- Public checkout can create order item rows.
drop policy if exists "Anyone can create order items" on order_items;
create policy "Anyone can create order items" on order_items for insert with check (true);

drop policy if exists "Admin can view order items" on order_items;
create policy "Admin can view order items" on order_items for select using (true);

-- Admin app policies. These use authenticated users and your admin_users table.
drop policy if exists "Admin can view order status history" on order_status_history;
create policy "Admin can view order status history" on order_status_history for select to authenticated using (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can create order status history" on order_status_history;
create policy "Admin can create order status history" on order_status_history for insert to authenticated with check (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can view order notes" on order_notes;
create policy "Admin can view order notes" on order_notes for select to authenticated using (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can create order notes" on order_notes;
create policy "Admin can create order notes" on order_notes for insert to authenticated with check (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can view inventory history" on inventory_history;
create policy "Admin can view inventory history" on inventory_history for select to authenticated using (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can create inventory history" on inventory_history;
create policy "Admin can create inventory history" on inventory_history for insert to authenticated with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- Make sure admins can update products and orders.
drop policy if exists "Admin can update products" on products;
create policy "Admin can update products" on products for update to authenticated using (exists (select 1 from admin_users au where au.email = auth.email())) with check (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admin can update orders" on orders;
create policy "Admin can update orders" on orders for update to authenticated using (exists (select 1 from admin_users au where au.email = auth.email())) with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- Stock reduction and inventory history for checkout order items.
create or replace function reduce_product_stock_sprint3()
returns trigger
language plpgsql
as $$
declare
  before_qty integer;
  after_qty integer;
  pname text;
  pbrand text;
begin
  select stock, name, brand into before_qty, pname, pbrand from products where id = new.product_id;
  if before_qty is null then
    return new;
  end if;

  after_qty := greatest(before_qty - new.quantity, 0);

  update products
  set stock = after_qty
  where id = new.product_id;

  insert into inventory_history (
    product_id,
    product_name,
    brand,
    change_amount,
    quantity_before,
    quantity_after,
    reason,
    note,
    changed_by,
    order_id
  ) values (
    new.product_id,
    coalesce(new.product_name, pname),
    coalesce(new.brand, pbrand),
    -abs(new.quantity),
    before_qty,
    after_qty,
    'order',
    'Stock reduced after order',
    'system',
    new.order_id
  );

  return new;
end;
$$;

drop trigger if exists trg_reduce_product_stock on order_items;
drop trigger if exists trg_reduce_product_stock_sprint3 on order_items;
create trigger trg_reduce_product_stock_sprint3
after insert on order_items
for each row execute function reduce_product_stock_sprint3();
