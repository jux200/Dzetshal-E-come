async function loadMarketingHub(){
  await requireAdmin();
  const boxes={coupons:'coupons',reviews:'reviews',subs:'newsletter_subscribers',flash:'flash_sales',gift:'gift_cards'};
  for(const [id,table] of Object.entries(boxes)){
    const {count}=await sb.from(table).select('*',{count:'exact',head:true});
    const el=document.getElementById(id+'Count'); if(el) el.textContent=count||0;
  }
  const {data:recentCoupons}=await sb.from('coupons').select('*').order('created_at',{ascending:false}).limit(5);
  const list=document.getElementById('recentMarketing');
  if(list) list.innerHTML=(recentCoupons||[]).map(c=>`<div class='item'><strong>${c.code}</strong><span>${c.discount_type} · ${c.discount_value}${c.discount_type==='percent'?'%':' RWF'} · ${c.active?'Active':'Inactive'}</span></div>`).join('')||`<div class='empty compact'>No marketing activity yet.</div>`;
}

document.addEventListener('DOMContentLoaded',loadMarketingHub);
