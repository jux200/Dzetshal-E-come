-- Dzetshal Phase 10 final checks and safe schema updates

-- Required columns for product images
alter table product_images add column if not exists storage_path text;
alter table product_images add column if not exists alt_text text;
alter table product_images add column if not exists is_main boolean default false;
alter table product_images add column if not exists created_at timestamp with time zone default now();

-- Required order columns
alter table orders add column if not exists payment_status text default 'Pending';
alter table orders add column if not exists delivery_status text default 'Pending';
alter table orders add column if not exists notes text;
alter table orders add column if not exists invoice_number text;
alter table orders add column if not exists currency text default 'RWF';
alter table orders add column if not exists updated_at timestamp with time zone default now();

-- Order items table
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

alter table order_items enable row level security;

drop policy if exists "Anyone can create order items" on order_items;
create policy "Anyone can create order items"
on order_items
for insert
with check (true);

drop policy if exists "Admin/public can view order items" on order_items;
create policy "Admin/public can view order items"
on order_items
for select
using (true);

-- Product public read policy
alter table products enable row level security;
drop policy if exists "Public can view products" on products;
create policy "Public can view products"
on products
for select
using (status is null or status <> 'hidden');

-- Orders insert/read policies
alter table orders enable row level security;
drop policy if exists "Anyone can create orders" on orders;
create policy "Anyone can create orders"
on orders
for insert
with check (true);

drop policy if exists "Admin/public can view orders" on orders;
create policy "Admin/public can view orders"
on orders
for select
using (true);

-- Product images policies
alter table product_images enable row level security;
drop policy if exists "Public can view product images" on product_images;
create policy "Public can view product images"
on product_images
for select
using (true);

drop policy if exists "Authenticated can manage product images" on product_images;
create policy "Authenticated can manage product images"
on product_images
for all
to authenticated
using (true)
with check (true);

-- Storage bucket and policies
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product storage" on storage.objects;
create policy "Public can view product storage"
on storage.objects
for select
using (bucket_id = 'products');

drop policy if exists "Authenticated admin can upload product storage" on storage.objects;
create policy "Authenticated admin can upload product storage"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'products');

drop policy if exists "Authenticated admin can update product storage" on storage.objects;
create policy "Authenticated admin can update product storage"
on storage.objects
for update
to authenticated
using (bucket_id = 'products')
with check (bucket_id = 'products');

drop policy if exists "Authenticated admin can delete product storage" on storage.objects;
create policy "Authenticated admin can delete product storage"
on storage.objects
for delete
to authenticated
using (bucket_id = 'products');

-- Order number generator
create sequence if not exists order_sequence start 1001;

create or replace function generate_order_number()
returns text
language plpgsql
as $$
declare
    seq integer;
begin
    seq := nextval('order_sequence');
    return 'DZ-' || to_char(now(),'YYYY') || '-' || lpad(seq::text,5,'0');
end;
$$;

-- Stock reduction trigger
create or replace function reduce_product_stock()
returns trigger
language plpgsql
as $$
declare
  before_qty integer;
  after_qty integer;
begin
  select stock into before_qty from products where id = new.product_id;

  update products
  set stock = greatest(coalesce(stock, 0) - new.quantity, 0)
  where id = new.product_id;

  select stock into after_qty from products where id = new.product_id;

  insert into stock_logs (
    product_id,
    product_name,
    change_type,
    quantity_before,
    quantity_after,
    note
  ) values (
    new.product_id,
    new.product_name,
    'order',
    before_qty,
    after_qty,
    'Stock reduced after order'
  );

  return new;
end;
$$;

drop trigger if exists trg_reduce_product_stock on order_items;
create trigger trg_reduce_product_stock
after insert on order_items
for each row
execute function reduce_product_stock();

-- Useful indexes
create index if not exists idx_products_brand on products(brand);
create index if not exists idx_products_type on products(type);
create index if not exists idx_products_gender on products(gender);
create index if not exists idx_products_status on products(status);
create index if not exists idx_orders_created_at on orders(created_at desc);
create index if not exists idx_order_items_order_id on order_items(order_id);
create index if not exists idx_product_images_product_id on product_images(product_id);
