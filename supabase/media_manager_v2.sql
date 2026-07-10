-- Media Manager v2: one reliable main image per product.

alter table product_images
  add column if not exists storage_path text,
  add column if not exists alt_text text,
  add column if not exists is_main boolean default false;

-- Remove duplicate main images before creating the unique index.
with ranked as (
  select id, product_id,
         row_number() over (partition by product_id order by is_main desc, sort_order asc, created_at asc) as rn
  from product_images
)
update product_images pi
set is_main = case when ranked.rn = 1 then true else false end
from ranked
where pi.id = ranked.id;

create unique index if not exists product_images_one_main_per_product
on product_images(product_id)
where is_main = true;

-- Helpful index for fast gallery loading.
create index if not exists product_images_product_sort_idx
on product_images(product_id, is_main desc, sort_order asc, created_at asc);

-- Keep products.image_url mirrored when a product_images row is marked as main.
create or replace function sync_product_image_url_from_main()
returns trigger
language plpgsql
as $$
begin
  if new.is_main = true then
    update products
    set image_url = new.image_url
    where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_product_image_url_from_main on product_images;
create trigger trg_sync_product_image_url_from_main
after insert or update of is_main, image_url on product_images
for each row
execute function sync_product_image_url_from_main();
