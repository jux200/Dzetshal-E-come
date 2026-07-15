-- Dzetshal final deployment stabilization
-- Run this entire file once in Supabase SQL Editor.
-- It is safe to run repeatedly.

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

create index if not exists orders_tracking_order_number_idx
on public.orders (public.dzetshal_normalize_order_number(order_number));

create or replace function public.track_customer_order(
  p_order_number text,
  p_contact text
)
returns jsonb
language plpgsql
security definer
set search_path=public
set row_security=off
as $$
declare
  o public.orders%rowtype;
  oj jsonb;
  payload jsonb;
  supplied_email text := lower(trim(coalesce(p_contact,'')));
  supplied_phone text := public.dzetshal_normalize_phone(p_contact);
  order_key text := public.dzetshal_normalize_order_number(p_order_number);
  email_match boolean := false;
  phone_match boolean := false;
  saved_items jsonb := '[]'::jsonb;
begin
  if order_key = '' or trim(coalesce(p_contact,'')) = '' then
    return null;
  end if;

  select * into o
  from public.orders
  where public.dzetshal_normalize_order_number(order_number)=order_key
  order by created_at desc
  limit 1;

  if o.id is null then
    return null;
  end if;

  oj := to_jsonb(o);

  email_match := supplied_email <> '' and supplied_email = any(array[
    lower(trim(coalesce(oj->>'customer_email',''))),
    lower(trim(coalesce(oj->>'email','')))
  ]);

  phone_match := supplied_phone <> '' and supplied_phone = any(array[
    public.dzetshal_normalize_phone(oj->>'customer_phone'),
    public.dzetshal_normalize_phone(oj->>'phone'),
    public.dzetshal_normalize_phone(oj->>'receiver_phone')
  ]);

  if not (email_match or phone_match) then
    return null;
  end if;

  if to_regclass('public.order_items') is not null then
    execute 'select coalesce(jsonb_agg(to_jsonb(oi) order by oi.created_at),''[]''::jsonb) from public.order_items oi where oi.order_id=$1'
      into saved_items using o.id;
  end if;

  if saved_items = '[]'::jsonb and jsonb_typeof(oj->'items')='array' then
    saved_items := oj->'items';
  end if;

  payload := jsonb_build_object(
    'order', jsonb_build_object(
      'order_number',oj->>'order_number',
      'created_at',oj->>'created_at',
      'customer_name',oj->>'customer_name',
      'city',oj->>'city',
      'total',coalesce((oj->>'total')::numeric,0),
      'status',coalesce(oj->>'status','pending'),
      'payment_method',oj->>'payment_method',
      'payment_status',coalesce(oj->>'payment_status','pending'),
      'delivery_method',coalesce(oj->>'delivery_method','pickup'),
      'delivery_status',coalesce(oj->>'delivery_status','pending'),
      'transport_company',oj->>'transport_company',
      'transport_destination',oj->>'transport_destination',
      'tracking_reference',oj->>'tracking_reference'
    ),
    'items',coalesce(saved_items,'[]'::jsonb),
    'history',case
      when to_regclass('public.order_status_history') is null then '[]'::jsonb
      else coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'created_at',h.created_at) order by h.created_at)
                     from public.order_status_history h where h.order_id=o.id),'[]'::jsonb)
    end
  );

  return payload;
end;
$$;

revoke all on function public.track_customer_order(text,text) from public;
grant execute on function public.track_customer_order(text,text) to anon,authenticated;
grant execute on function public.dzetshal_normalize_phone(text) to anon,authenticated;
grant execute on function public.dzetshal_normalize_order_number(text) to anon,authenticated;
