-- Sprint 6.2.4: customer tracking + brand theme controls
-- Safe to run more than once.

alter table theme_settings add column if not exists logo_theme text default 'green';
alter table theme_settings add column if not exists logo_size integer default 125;
alter table theme_settings add column if not exists show_store_name boolean default true;
alter table theme_settings add column if not exists show_tagline boolean default true;
update theme_settings
set logo_theme=coalesce(logo_theme,'green'),
    logo_size=least(160,greatest(88,coalesce(logo_size,125))),
    show_store_name=coalesce(show_store_name,true),
    show_tagline=coalesce(show_tagline,true);

create or replace function public.dzetshal_normalize_phone(p_value text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_value,''),'[^0-9]','','g')) >= 9
      then right(regexp_replace(coalesce(p_value,''),'[^0-9]','','g'),9)
    else regexp_replace(coalesce(p_value,''),'[^0-9]','','g')
  end;
$$;

create or replace function public.dzetshal_normalize_order_number(p_value text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(trim(coalesce(p_value,'')),'[^A-Za-z0-9]','','g'));
$$;

create or replace function public.track_customer_order(p_order_number text,p_contact text)
returns jsonb
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  o public.orders%rowtype;
  payload jsonb;
  contact_email text := lower(trim(coalesce(p_contact,'')));
  contact_phone text := public.dzetshal_normalize_phone(p_contact);
  order_key text := public.dzetshal_normalize_order_number(p_order_number);
  saved_items jsonb;
begin
  if order_key = '' or trim(coalesce(p_contact,'')) = '' then
    return null;
  end if;

  select * into o
  from public.orders
  where public.dzetshal_normalize_order_number(order_number)=order_key
    and (
      lower(trim(coalesce(customer_email,'')))=contact_email
      or (
        contact_phone <> ''
        and public.dzetshal_normalize_phone(customer_phone)=contact_phone
      )
    )
  order by created_at desc
  limit 1;

  if o.id is null then
    return null;
  end if;

  select coalesce(
    (select jsonb_agg(to_jsonb(oi) order by oi.created_at)
       from public.order_items oi where oi.order_id=o.id),
    case
      when jsonb_typeof(to_jsonb(o)->'items')='array' then to_jsonb(o)->'items'
      else '[]'::jsonb
    end
  ) into saved_items;

  select jsonb_build_object(
    'order', jsonb_build_object(
      'order_number',o.order_number,
      'created_at',o.created_at,
      'customer_name',o.customer_name,
      'city',o.city,
      'total',o.total,
      'status',o.status,
      'payment_method',o.payment_method,
      'payment_status',o.payment_status,
      'delivery_method',o.delivery_method,
      'delivery_status',o.delivery_status,
      'transport_company',o.transport_company,
      'transport_destination',o.transport_destination,
      'tracking_reference',o.tracking_reference
    ),
    'items',coalesce(saved_items,'[]'::jsonb),
    'history',coalesce(
      (select jsonb_agg(
        jsonb_build_object('status',h.status,'created_at',h.created_at)
        order by h.created_at
      ) from public.order_status_history h where h.order_id=o.id),
      '[]'::jsonb
    )
  ) into payload;

  return payload;
end;
$$;

revoke all on function public.track_customer_order(text,text) from public;
grant execute on function public.track_customer_order(text,text) to anon,authenticated;
grant execute on function public.dzetshal_normalize_phone(text) to anon,authenticated;
grant execute on function public.dzetshal_normalize_order_number(text) to anon,authenticated;
