-- Sprint 6.2: customer order tracking and brand theme controls
alter table theme_settings add column if not exists logo_theme text default 'green';
alter table theme_settings add column if not exists logo_size integer default 180;
alter table theme_settings add column if not exists show_store_name boolean default true;
alter table theme_settings add column if not exists show_tagline boolean default true;
update theme_settings set logo_theme=coalesce(logo_theme,'green'),logo_size=coalesce(logo_size,180),show_store_name=coalesce(show_store_name,true),show_tagline=coalesce(show_tagline,true);

create or replace function public.track_customer_order(p_order_number text,p_contact text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare o orders%rowtype; payload jsonb; clean_contact text;
begin
 clean_contact:=lower(regexp_replace(coalesce(p_contact,''),'[[:space:]()+-]','','g'));
 select * into o from orders
 where lower(order_number)=lower(trim(p_order_number))
 and (lower(coalesce(customer_email,''))=lower(trim(p_contact)) or regexp_replace(coalesce(customer_phone,''),'[[:space:]()+-]','','g')=clean_contact)
 limit 1;
 if o.id is null then return null; end if;
 select jsonb_build_object(
  'order',to_jsonb(o)-'admin_delivery_note'-'notes',
  'items',coalesce((select jsonb_agg(to_jsonb(oi) order by oi.created_at) from order_items oi where oi.order_id=o.id),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'created_at',h.created_at) order by h.created_at) from order_status_history h where h.order_id=o.id),'[]'::jsonb)
 ) into payload;
 return payload;
end;$$;
revoke all on function public.track_customer_order(text,text) from public;
grant execute on function public.track_customer_order(text,text) to anon,authenticated;
