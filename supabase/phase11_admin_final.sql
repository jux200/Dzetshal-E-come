-- Phase 11 admin policies and helpful columns
create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

alter table admin_users enable row level security;
drop policy if exists "Admin users can view own admin record" on admin_users;
create policy "Admin users can view own admin record"
on admin_users for select
using (auth.email() = email);

insert into admin_users (email, role) values ('dzetshalweb@gmail.com','admin') on conflict(email) do nothing;

alter table orders add column if not exists updated_at timestamp with time zone default now();
alter table orders add column if not exists status text default 'pending';
alter table products add column if not exists status text default 'active';
alter table products add column if not exists featured boolean default false;
alter table product_images add column if not exists storage_path text;
alter table product_images add column if not exists alt_text text;
alter table product_images add column if not exists is_main boolean default false;
