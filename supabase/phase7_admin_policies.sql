
-- DZETSHAL PHASE 7 ADMIN POLICIES
-- Run this in Supabase SQL Editor.
-- PostgreSQL does NOT support CREATE POLICY IF NOT EXISTS, so every policy is dropped first.

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

alter table admin_users enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table product_images enable row level security;
alter table stock_logs enable row level security;

insert into admin_users (email, role)
values ('dzetshalweb@gmail.com', 'admin')
on conflict (email) do nothing;

-- Helper: admin check uses authenticated user's email.

-- ADMIN USERS
drop policy if exists "Admin users can view own admin record" on admin_users;
create policy "Admin users can view own admin record"
on admin_users for select
using (auth.email() = email);

-- PRODUCTS
-- Keep public read available for storefront.
drop policy if exists "Public can view products" on products;
create policy "Public can view products"
on products for select
using (true);

drop policy if exists "Admins can insert products" on products;
create policy "Admins can insert products"
on products for insert
to authenticated
with check (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can update products" on products;
create policy "Admins can update products"
on products for update
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can delete products" on products;
create policy "Admins can delete products"
on products for delete
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()));

-- ORDERS
drop policy if exists "Anyone can create orders" on orders;
create policy "Anyone can create orders"
on orders for insert
with check (true);

drop policy if exists "Admins can view orders" on orders;
create policy "Admins can view orders"
on orders for select
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can update orders" on orders;
create policy "Admins can update orders"
on orders for update
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- CATEGORIES
drop policy if exists "Public can view categories" on categories;
create policy "Public can view categories"
on categories for select
using (true);

drop policy if exists "Admins can manage categories" on categories;
create policy "Admins can manage categories"
on categories for all
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- BRANDS
drop policy if exists "Public can view brands" on brands;
create policy "Public can view brands"
on brands for select
using (true);

drop policy if exists "Admins can manage brands" on brands;
create policy "Admins can manage brands"
on brands for all
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- PRODUCT IMAGES
drop policy if exists "Public can view product images" on product_images;
create policy "Public can view product images"
on product_images for select
using (true);

drop policy if exists "Admins can manage product images" on product_images;
create policy "Admins can manage product images"
on product_images for all
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- STOCK LOGS
drop policy if exists "Admins can view stock logs" on stock_logs;
create policy "Admins can view stock logs"
on stock_logs for select
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can insert stock logs" on stock_logs;
create policy "Admins can insert stock logs"
on stock_logs for insert
to authenticated
with check (exists (select 1 from admin_users au where au.email = auth.email()));

-- STORAGE: product image bucket policies.
-- Make sure the bucket name is exactly: products
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view storage product images" on storage.objects;
create policy "Public can view storage product images"
on storage.objects for select
using (bucket_id = 'products');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products' and exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'products' and exists (select 1 from admin_users au where au.email = auth.email()))
with check (bucket_id = 'products' and exists (select 1 from admin_users au where au.email = auth.email()));

drop policy if exists "Admins can delete product images" on storage.objects;
create policy "Admins can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'products' and exists (select 1 from admin_users au where au.email = auth.email()));
