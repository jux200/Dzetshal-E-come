
-- Dzetshal Practical Launch v1: local payment, transport dispatch, settings, homepage, theme, audit, monitor, backups

-- Extend orders for non-gateway payments and local delivery/transport workflow
alter table orders add column if not exists payment_status text default 'pending';
alter table orders add column if not exists delivery_method text default 'pickup';
alter table orders add column if not exists delivery_status text default 'pending';
alter table orders add column if not exists transport_company text;
alter table orders add column if not exists transport_destination text;
alter table orders add column if not exists receiver_name text;
alter table orders add column if not exists receiver_phone text;
alter table orders add column if not exists tracking_reference text;
alter table orders add column if not exists delivery_fee numeric default 0;
alter table orders add column if not exists admin_delivery_note text;
alter table orders add column if not exists updated_at timestamp with time zone default now();


-- Store settings migration is intentionally defensive.
-- If an older store_settings table already exists without an id column,
-- this adds/syncs the id instead of failing.
create table if not exists store_settings (
  id text primary key default 'main'
);

alter table store_settings add column if not exists id text;
alter table store_settings add column if not exists key text;
update store_settings set id = 'main' where id is null;
update store_settings set key = 'main' where key is null;
delete from store_settings a
using store_settings b
where a.id = b.id and a.ctid < b.ctid;

-- Ensure id is safe to use even if an older table already had a different primary key.
alter table store_settings alter column id set default 'main';
create unique index if not exists store_settings_id_uidx on store_settings(id);

alter table store_settings add column if not exists store_name text default 'Dzetshal';
alter table store_settings add column if not exists tagline text default 'Jardin de Beauté';
alter table store_settings add column if not exists email text default 'dzetshalweb@gmail.com';
alter table store_settings add column if not exists whatsapp text default '+250 795 308 453';
alter table store_settings add column if not exists phone text;
alter table store_settings add column if not exists currency text default 'RWF';
alter table store_settings add column if not exists momo_number text;
alter table store_settings add column if not exists momo_name text;
alter table store_settings add column if not exists pickup_address text;
alter table store_settings add column if not exists announcement text default 'All prices include VAT';
alter table store_settings add column if not exists facebook_url text;
alter table store_settings add column if not exists instagram_url text;
alter table store_settings add column if not exists tiktok_url text;
alter table store_settings add column if not exists updated_at timestamp with time zone default now();

insert into store_settings (id, key)
select 'main', 'main'
where not exists (select 1 from store_settings where id = 'main');

alter table store_settings enable row level security;
drop policy if exists "Public can view store settings" on store_settings;
create policy "Public can view store settings" on store_settings for select using (true);
drop policy if exists "Authenticated admin can update store settings" on store_settings;
create policy "Authenticated admin can update store settings" on store_settings for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated admin can insert store settings" on store_settings;
create policy "Authenticated admin can insert store settings" on store_settings for insert to authenticated with check (true);

create table if not exists homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  title text,
  subtitle text,
  is_active boolean default true,
  sort_order integer default 0,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table homepage_sections enable row level security;
drop policy if exists "Public can view homepage sections" on homepage_sections;
create policy "Public can view homepage sections" on homepage_sections for select using (true);
drop policy if exists "Authenticated admin can manage homepage sections" on homepage_sections;
create policy "Authenticated admin can manage homepage sections" on homepage_sections for all to authenticated using (true) with check (true);

insert into homepage_sections (section_key,title,subtitle,sort_order,is_active) values
('hero','Hero Banner','Main homepage banner',1,true),
('featured','Featured Products','Curated fragrance highlights',2,true),
('flash_sale','Flash Sale','Limited-time offers',3,true),
('brands','Luxury Brands','Shop by house',4,true),
('testimonials','Testimonials','Customer feedback',5,true),
('newsletter','Newsletter','Customer signup',6,true)
on conflict do nothing;


-- Theme settings, also defensive for older schemas.
create table if not exists theme_settings (
  id text primary key default 'main'
);

alter table theme_settings add column if not exists id text;
alter table theme_settings add column if not exists key text;
update theme_settings set id = 'main' where id is null;
update theme_settings set key = 'main' where key is null;
delete from theme_settings a
using theme_settings b
where a.id = b.id and a.ctid < b.ctid;

-- Ensure id is safe to use even if an older table already had a different primary key.
alter table theme_settings alter column id set default 'main';
create unique index if not exists theme_settings_id_uidx on theme_settings(id);

alter table theme_settings add column if not exists primary_color text default '#224C44';
alter table theme_settings add column if not exists accent_color text default '#F8B38F';
alter table theme_settings add column if not exists header_style text default 'classic';
alter table theme_settings add column if not exists button_style text default 'rounded';
alter table theme_settings add column if not exists font_heading text default 'HolidayFree';
alter table theme_settings add column if not exists font_subtitle text default 'Montserrat';
alter table theme_settings add column if not exists updated_at timestamp with time zone default now();

insert into theme_settings (id, key)
select 'main', 'main'
where not exists (select 1 from theme_settings where id = 'main');

alter table theme_settings enable row level security;
drop policy if exists "Public can view theme settings" on theme_settings;
create policy "Public can view theme settings" on theme_settings for select using (true);
drop policy if exists "Authenticated admin can manage theme settings" on theme_settings;
create policy "Authenticated admin can manage theme settings" on theme_settings for all to authenticated using (true) with check (true);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_email text,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

alter table activity_logs enable row level security;
drop policy if exists "Authenticated admins can view activity logs" on activity_logs;
create policy "Authenticated admins can view activity logs" on activity_logs for select to authenticated using (true);
drop policy if exists "Authenticated admins can create activity logs" on activity_logs;
create policy "Authenticated admins can create activity logs" on activity_logs for insert to authenticated with check (true);

create table if not exists system_errors (
  id uuid primary key default gen_random_uuid(),
  source text,
  message text not null,
  details jsonb default '{}'::jsonb,
  status text default 'open',
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

alter table system_errors enable row level security;
drop policy if exists "Authenticated admins can manage system errors" on system_errors;
create policy "Authenticated admins can manage system errors" on system_errors for all to authenticated using (true) with check (true);

create table if not exists backup_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text default 'manual',
  summary jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamp with time zone default now()
);

alter table backup_snapshots enable row level security;
drop policy if exists "Authenticated admins can manage backup snapshots" on backup_snapshots;
create policy "Authenticated admins can manage backup snapshots" on backup_snapshots for all to authenticated using (true) with check (true);

-- Optional helper RPC for dashboard/admin logging.
create or replace function log_admin_activity(p_action text, p_entity_type text default null, p_entity_id text default null, p_details jsonb default '{}'::jsonb)
returns void language plpgsql security definer as $$
begin
  insert into activity_logs(admin_email, action, entity_type, entity_id, details)
  values (auth.email(), p_action, p_entity_type, p_entity_id, p_details);
end;
$$;
