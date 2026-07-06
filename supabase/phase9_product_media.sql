-- Phase 9: Product media manager
-- Run this in Supabase SQL Editor before testing image upload/delete.

alter table product_images
add column if not exists storage_path text;

alter table product_images
add column if not exists alt_text text;

alter table product_images
add column if not exists is_main boolean default false;

alter table product_images enable row level security;

-- Keep product image gallery readable by the public storefront.
drop policy if exists "Public can view product images" on product_images;
create policy "Public can view product images"
on product_images
for select
using (true);

-- Admin users can manage product image rows after Supabase Auth login.
drop policy if exists "Authenticated admin can insert product images" on product_images;
create policy "Authenticated admin can insert product images"
on product_images
for insert
to authenticated
with check (
  exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);

drop policy if exists "Authenticated admin can update product images" on product_images;
create policy "Authenticated admin can update product images"
on product_images
for update
to authenticated
using (
  exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
)
with check (
  exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);

drop policy if exists "Authenticated admin can delete product images" on product_images;
create policy "Authenticated admin can delete product images"
on product_images
for delete
to authenticated
using (
  exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);

-- Storage bucket and policies.
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view products bucket" on storage.objects;
create policy "Public can view products bucket"
on storage.objects
for select
using (bucket_id = 'products');

drop policy if exists "Authenticated admin can upload products bucket" on storage.objects;
create policy "Authenticated admin can upload products bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'products'
  and exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);

drop policy if exists "Authenticated admin can update products bucket" on storage.objects;
create policy "Authenticated admin can update products bucket"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'products'
  and exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
)
with check (
  bucket_id = 'products'
  and exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);

drop policy if exists "Authenticated admin can delete products bucket" on storage.objects;
create policy "Authenticated admin can delete products bucket"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'products'
  and exists (
    select 1 from admin_users
    where admin_users.email = auth.email()
  )
);
