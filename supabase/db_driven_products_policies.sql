
-- Dzetshal DB-driven storefront/admin helper SQL
-- Run this once in Supabase SQL Editor if any of these columns are missing.

alter table products add column if not exists sku text;
alter table products add column if not exists featured boolean default false;
alter table products add column if not exists story text;
alter table products add column if not exists top_notes text;
alter table products add column if not exists middle_notes text;
alter table products add column if not exists base_notes text;
alter table products add column if not exists image_url text;
alter table products add column if not exists status text default 'active';
alter table products add column if not exists updated_at timestamp with time zone default now();

create index if not exists products_brand_idx on products(brand);
create index if not exists products_type_idx on products(type);
create index if not exists products_gender_idx on products(gender);
create index if not exists products_status_idx on products(status);
create index if not exists products_sku_idx on products(sku);

alter table products enable row level security;
alter table orders enable row level security;
alter table categories enable row level security;
alter table brands enable row level security;
alter table product_images enable row level security;

-- Public storefront read policies
DROP POLICY IF EXISTS "Public can view active products" ON products;
CREATE POLICY "Public can view active products"
ON products FOR SELECT
USING (coalesce(status,'active') in ('active','published','available'));

DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view categories" ON categories;
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view brands" ON brands;
CREATE POLICY "Public can view brands" ON brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view product images" ON product_images;
CREATE POLICY "Public can view product images" ON product_images FOR SELECT USING (true);

-- Admin policies. They use the admin_users table you created earlier.
DROP POLICY IF EXISTS "Admins can read products" ON products;
CREATE POLICY "Admins can read products" ON products FOR SELECT
USING (exists (select 1 from admin_users a where a.email = auth.email()));

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products FOR INSERT
WITH CHECK (exists (select 1 from admin_users a where a.email = auth.email()));

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products FOR UPDATE
USING (exists (select 1 from admin_users a where a.email = auth.email()))
WITH CHECK (exists (select 1 from admin_users a where a.email = auth.email()));

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products" ON products FOR DELETE
USING (exists (select 1 from admin_users a where a.email = auth.email()));

DROP POLICY IF EXISTS "Admins can read orders" ON orders;
CREATE POLICY "Admins can read orders" ON orders FOR SELECT
USING (exists (select 1 from admin_users a where a.email = auth.email()));

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE
USING (exists (select 1 from admin_users a where a.email = auth.email()))
WITH CHECK (exists (select 1 from admin_users a where a.email = auth.email()));
