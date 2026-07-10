
-- Sprint 5.2 + 5.3: Smart Analytics and Inventory Intelligence
-- Safe to run more than once.

create table if not exists daily_sales_summary (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null unique,
  orders_count integer default 0,
  revenue numeric default 0,
  average_order_value numeric default 0,
  new_customers integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists product_statistics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  product_name text,
  brand text,
  units_sold integer default 0,
  revenue numeric default 0,
  last_sold_at timestamptz,
  views integer default 0,
  wishlisted integer default 0,
  reviews_count integer default 0,
  average_rating numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(product_id)
);

create table if not exists inventory_metrics (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  product_name text,
  brand text,
  current_stock integer default 0,
  stock_value numeric default 0,
  units_sold_30_days integer default 0,
  days_of_stock integer,
  inventory_status text default 'normal',
  recommendation text,
  calculated_at timestamptz default now(),
  unique(product_id)
);

create table if not exists analytics_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table daily_sales_summary enable row level security;
alter table product_statistics enable row level security;
alter table inventory_metrics enable row level security;
alter table analytics_cache enable row level security;

drop policy if exists "Admins can read daily sales summary" on daily_sales_summary;
create policy "Admins can read daily sales summary" on daily_sales_summary for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can read product statistics" on product_statistics;
create policy "Admins can read product statistics" on product_statistics for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can read inventory metrics" on inventory_metrics;
create policy "Admins can read inventory metrics" on inventory_metrics for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can read analytics cache" on analytics_cache;
create policy "Admins can read analytics cache" on analytics_cache for select using (auth.role() = 'authenticated');

drop policy if exists "Admins can upsert analytics cache" on analytics_cache;
create policy "Admins can upsert analytics cache" on analytics_cache for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Optional helper view: best-selling products from order_items.
create or replace view v_best_selling_products as
select
  product_id,
  product_name,
  brand,
  sum(quantity)::integer as units_sold,
  sum(line_total)::numeric as revenue
from order_items
group by product_id, product_name, brand
order by revenue desc;
