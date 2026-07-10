
-- Sprint 6: Store banner management + production settings foundation
create table if not exists store_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Dzetshal',
  subtitle text,
  eyebrow text,
  image_url text not null,
  storage_path text,
  button_text text default 'Shop Now',
  button_link text default '#products',
  secondary_button_text text default 'Our Story',
  secondary_button_link text default '#about',
  sort_order integer default 0,
  opacity numeric default 0.75,
  is_active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table store_banners enable row level security;

drop policy if exists "Public can view active store banners" on store_banners;
create policy "Public can view active store banners"
on store_banners for select
using (is_active = true or auth.role() = 'authenticated');

drop policy if exists "Admins can insert store banners" on store_banners;
create policy "Admins can insert store banners"
on store_banners for insert
to authenticated
with check (exists (select 1 from admin_users where email = auth.email()));

drop policy if exists "Admins can update store banners" on store_banners;
create policy "Admins can update store banners"
on store_banners for update
to authenticated
using (exists (select 1 from admin_users where email = auth.email()))
with check (exists (select 1 from admin_users where email = auth.email()));

drop policy if exists "Admins can delete store banners" on store_banners;
create policy "Admins can delete store banners"
on store_banners for delete
to authenticated
using (exists (select 1 from admin_users where email = auth.email()));

insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view banner images" on storage.objects;
create policy "Public can view banner images"
on storage.objects for select
using (bucket_id = 'banners');

drop policy if exists "Admins can upload banner images" on storage.objects;
create policy "Admins can upload banner images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'banners' and exists (select 1 from admin_users where email = auth.email()));

drop policy if exists "Admins can update banner images" on storage.objects;
create policy "Admins can update banner images"
on storage.objects for update
to authenticated
using (bucket_id = 'banners' and exists (select 1 from admin_users where email = auth.email()))
with check (bucket_id = 'banners' and exists (select 1 from admin_users where email = auth.email()));

drop policy if exists "Admins can delete banner images" on storage.objects;
create policy "Admins can delete banner images"
on storage.objects for delete
to authenticated
using (bucket_id = 'banners' and exists (select 1 from admin_users where email = auth.email()));

create table if not exists store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table store_settings enable row level security;

drop policy if exists "Public can view public store settings" on store_settings;
create policy "Public can view public store settings"
on store_settings for select
using (true);

drop policy if exists "Admins can manage store settings" on store_settings;
create policy "Admins can manage store settings"
on store_settings for all
to authenticated
using (exists (select 1 from admin_users where email = auth.email()))
with check (exists (select 1 from admin_users where email = auth.email()));
