let coupons=[];
async function loadCoupons(){
  await requireAdmin();
  const {data,error}=await sb.from('coupons').select('*').order('created_at',{ascending:false});
  if(error){toast(error.message);return}
  coupons=data||[]; renderCoupons();
}
function renderCoupons(){
  const q=(document.getElementById('couponSearch')?.value||'').toLowerCase();
  const rows=coupons.filter(c=>!q||String(c.code).toLowerCase().includes(q));
  document.getElementById('couponRows').innerHTML=rows.map(c=>`<tr><td><span class='coupon-code'>${c.code}</span></td><td>${c.discount_type}</td><td>${c.discount_type==='percent'?c.discount_value+'%':fmtMoney(c.discount_value)}</td><td>${c.min_order_amount?fmtMoney(c.min_order_amount):'-'}</td><td>${c.expires_at?new Date(c.expires_at).toLocaleDateString():'No expiry'}</td><td><span class='badge ${c.active?'green':'red'}'>${c.active?'Active':'Inactive'}</span></td><td class='table-actions'><button class='btn outline small' onclick="toggleCoupon('${c.id}',${!c.active})">${c.active?'Disable':'Enable'}</button><button class='btn danger small' onclick="deleteCoupon('${c.id}')">Delete</button></td></tr>`).join('')||`<tr><td colspan='7' class='empty'>No coupons found.</td></tr>`;
}
async function saveCoupon(e){
  e.preventDefault(); const f=e.target;
  const payload={code:f.code.value.trim().toUpperCase(),discount_type:f.discount_type.value,discount_value:Number(f.discount_value.value||0),min_order_amount:Number(f.min_order_amount.value||0),max_uses:f.max_uses.value?Number(f.max_uses.value):null,expires_at:f.expires_at.value||null,active:f.active.checked,description:f.description.value};
  const {error}=await sb.from('coupons').insert(payload); if(error) return toast(error.message);
  f.reset(); f.active.checked=true; toast('Coupon created'); loadCoupons();
}
async function toggleCoupon(id,active){ const {error}=await sb.from('coupons').update({active}).eq('id',id); if(error) toast(error.message); else loadCoupons(); }
async function deleteCoupon(id){ if(!confirm('Delete this coupon?'))return; const {error}=await sb.from('coupons').delete().eq('id',id); if(error) toast(error.message); else loadCoupons(); }
document.addEventListener('DOMContentLoaded',()=>{loadCoupons(); document.getElementById('couponForm')?.addEventListener('submit',saveCoupon); document.getElementById('couponSearch')?.addEventListener('input',renderCoupons);});
