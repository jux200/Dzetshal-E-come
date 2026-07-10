-- Sprint 4: Marketing + Customer Experience
-- Run in Supabase SQL Editor.

alter table products add column if not exists featured boolean default false;
alter table products add column if not exists sale_price numeric;
alter table products add column if not exists sale_starts_at timestamptz;
alter table products add column if not exists sale_ends_at timestamptz;

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null default 'percent' check (discount_type in ('percent','fixed','free_shipping')),
  discount_value numeric not null default 0,
  min_order_amount numeric default 0,
  max_uses integer,
  used_count integer default 0,
  active boolean default true,
  starts_at timestamptz default now(),
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_email text,
  discount_amount numeric default 0,
  created_at timestamptz default now()
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  phone text,
  status text default 'active' check (status in ('active','unsubscribed')),
  source text default 'website',
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_name text,
  customer_email text,
  rating integer not null check (rating between 1 and 5),
  title text,
  comment text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  verified_purchase boolean default false,
  helpful_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references reviews(id) on delete cascade,
  image_url text not null,
  storage_path text,
  created_at timestamptz default now()
);

create table if not exists flash_sales (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  discount_percent numeric not null default 0,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists flash_sale_products (
  id uuid primary key default gen_random_uuid(),
  flash_sale_id uuid references flash_sales(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(flash_sale_id, product_id)
);

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  customer_email text,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(customer_email, product_id)
);

create table if not exists recently_viewed (
  id uuid primary key default gen_random_uuid(),
  customer_email text,
  anonymous_id text,
  product_id uuid references products(id) on delete cascade,
  viewed_at timestamptz default now()
);

create table if not exists loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_email text not null unique,
  customer_name text,
  points_balance integer default 0,
  lifetime_points integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  loyalty_account_id uuid references loyalty_accounts(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  points integer not null,
  reason text,
  created_at timestamptz default now()
);

create table if not exists gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_amount numeric not null,
  balance numeric not null,
  recipient_email text,
  purchaser_email text,
  active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists gift_card_transactions (
  id uuid primary key default gen_random_uuid(),
  gift_card_id uuid references gift_cards(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  amount numeric not null,
  transaction_type text default 'redeem',
  created_at timestamptz default now()
);

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  campaign_type text default 'newsletter',
  subject text,
  content text,
  status text default 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- RLS
alter table coupons enable row level security;
alter table coupon_redemptions enable row level security;
alter table newsletter_subscribers enable row level security;
alter table reviews enable row level security;
alter table review_images enable row level security;
alter table flash_sales enable row level security;
alter table flash_sale_products enable row level security;
alter table wishlist_items enable row level security;
alter table recently_viewed enable row level security;
alter table loyalty_accounts enable row level security;
alter table loyalty_transactions enable row level security;
alter table gift_cards enable row level security;
alter table gift_card_transactions enable row level security;
alter table marketing_campaigns enable row level security;

-- Public read rules where storefront needs data
drop policy if exists "Public can view active coupons" on coupons;
create policy "Public can view active coupons" on coupons for select using (active = true or auth.role() = 'authenticated');
drop policy if exists "Public can view approved reviews" on reviews;
create policy "Public can view approved reviews" on reviews for select using (status = 'approved' or auth.role() = 'authenticated');
drop policy if exists "Public can create reviews" on reviews;
create policy "Public can create reviews" on reviews for insert with check (true);
drop policy if exists "Public can view review images" on review_images;
create policy "Public can view review images" on review_images for select using (true);
drop policy if exists "Public can view active flash sales" on flash_sales;
create policy "Public can view active flash sales" on flash_sales for select using (active = true or auth.role() = 'authenticated');
drop policy if exists "Public can view flash sale products" on flash_sale_products;
create policy "Public can view flash sale products" on flash_sale_products for select using (true);
drop policy if exists "Public can subscribe newsletter" on newsletter_subscribers;
create policy "Public can subscribe newsletter" on newsletter_subscribers for insert with check (true);
drop policy if exists "Public can create wishlist items" on wishlist_items;
create policy "Public can create wishlist items" on wishlist_items for insert with check (true);
drop policy if exists "Public can view own wishlist items" on wishlist_items;
create policy "Public can view own wishlist items" on wishlist_items for select using (true);
drop policy if exists "Public can delete wishlist items" on wishlist_items;
create policy "Public can delete wishlist items" on wishlist_items for delete using (true);
drop policy if exists "Public can add recently viewed" on recently_viewed;
create policy "Public can add recently viewed" on recently_viewed for insert with check (true);
drop policy if exists "Public can view recently viewed" on recently_viewed;
create policy "Public can view recently viewed" on recently_viewed for select using (true);

-- Admin policies: authenticated users can manage marketing tables.
do $$
declare t text;
begin
  foreach t in array array['coupons','coupon_redemptions','newsletter_subscribers','reviews','review_images','flash_sales','flash_sale_products','wishlist_items','recently_viewed','loyalty_accounts','loyalty_transactions','gift_cards','gift_card_transactions','marketing_campaigns'] loop
    execute format('drop policy if exists "Authenticated admins can manage %s" on %I', t, t);
    execute format('create policy "Authenticated admins can manage %s" on %I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- Helpful indexes
create index if not exists idx_coupons_code on coupons(code);
create index if not exists idx_reviews_product on reviews(product_id);
create index if not exists idx_reviews_status on reviews(status);
create index if not exists idx_newsletter_email on newsletter_subscribers(email);
create index if not exists idx_wishlist_email on wishlist_items(customer_email);
create index if not exists idx_recently_viewed_product on recently_viewed(product_id);

-- Coupon validation helper
create or replace function validate_coupon(p_code text, p_total numeric)
returns table(valid boolean, coupon_id uuid, discount_amount numeric, message text)
language plpgsql
as $$
declare c coupons%rowtype;
begin
  select * into c from coupons where upper(code)=upper(p_code) limit 1;
  if c.id is null then return query select false, null::uuid, 0::numeric, 'Coupon not found'; return; end if;
  if not c.active then return query select false, c.id, 0::numeric, 'Coupon is inactive'; return; end if;
  if c.expires_at is not null and c.expires_at < now() then return query select false, c.id, 0::numeric, 'Coupon expired'; return; end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then return query select false, c.id, 0::numeric, 'Coupon usage limit reached'; return; end if;
  if coalesce(c.min_order_amount,0) > p_total then return query select false, c.id, 0::numeric, 'Minimum order not reached'; return; end if;
  return query select true, c.id,
    case when c.discount_type='percent' then round(p_total * c.discount_value / 100,0)
         when c.discount_type='fixed' then least(c.discount_value,p_total)
         else 0 end,
    'Coupon applied';
end;
$$;
