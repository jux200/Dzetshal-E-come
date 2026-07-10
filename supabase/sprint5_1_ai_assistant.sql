-- Sprint 5.1 AI Product Assistant optional support tables
create table if not exists ai_generations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  content_type text,
  prompt text,
  generated_content text,
  created_by text,
  created_at timestamp with time zone default now()
);
alter table ai_generations enable row level security;
drop policy if exists "Admins can manage ai generations" on ai_generations;
create policy "Admins can manage ai generations"
on ai_generations
for all
to authenticated
using (exists (select 1 from admin_users au where au.email = auth.email()))
with check (exists (select 1 from admin_users au where au.email = auth.email()));

alter table products add column if not exists seo_title text;
alter table products add column if not exists meta_description text;
alter table products add column if not exists top_notes text;
alter table products add column if not exists middle_notes text;
alter table products add column if not exists base_notes text;
