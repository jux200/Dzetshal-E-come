-- Sprint 2 / Phase 12 media manager support
alter table product_images add column if not exists storage_path text;
alter table product_images add column if not exists alt_text text;
alter table product_images add column if not exists is_main boolean default false;
alter table product_images add column if not exists updated_at timestamp with time zone default now();

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
using (bucket_id = 'products');

drop policy if exists "Authenticated admin can upload product images" on storage.objects;
create policy "Authenticated admin can upload product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'products');

drop policy if exists "Authenticated admin can update product images" on storage.objects;
create policy "Authenticated admin can update product images"
on storage.objects for update to authenticated
using (bucket_id = 'products');

drop policy if exists "Authenticated admin can delete product images" on storage.objects;
create policy "Authenticated admin can delete product images"
on storage.objects for delete to authenticated
using (bucket_id = 'products');


-- Sprint 2 fix: allow authenticated admins to update/delete media rows
alter table product_images enable row level security;

drop policy if exists "Authenticated admin can update product image rows" on product_images;
create policy "Authenticated admin can update product image rows"
on product_images for update to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admin can delete product image rows" on product_images;
create policy "Authenticated admin can delete product image rows"
on product_images for delete to authenticated
using (true);

drop policy if exists "Authenticated admin can insert product image rows" on product_images;
create policy "Authenticated admin can insert product image rows"
on product_images for insert to authenticated
with check (true);

drop policy if exists "Public can view product image rows" on product_images;
create policy "Public can view product image rows"
on product_images for select
using (true);
