
function normalizedOrderStatus(order){
  return String(order?.status || 'pending').trim().toLowerCase();
}
function normalizedPaymentStatus(order){
  return String(order?.payment_status || '').trim().toLowerCase();
}
function isTerminalOrder(order){
  return ['cancelled','canceled','refunded'].includes(normalizedOrderStatus(order));
}
function isRevenueOrder(order){
  if(isTerminalOrder(order)) return false;
  const status=normalizedOrderStatus(order);
  const payment=normalizedPaymentStatus(order);
  return payment === 'paid' || ['delivered','completed'].includes(status);
}


let insightsText=''; let products=[], items=[], orders=[]; const DAY=24*60*60*1000;
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
document.addEventListener('DOMContentLoaded',()=>{loadInsights(); document.getElementById('refreshBtn')?.addEventListener('click',loadInsights); document.getElementById('insightRange')?.addEventListener('change',loadInsights); document.getElementById('copyInsights')?.addEventListener('click',()=>{navigator.clipboard?.writeText(insightsText);toast('Insights copied')});});
async function loadInsights(){ if(!await requireAdmin())return; const days=Number(document.getElementById('insightRange')?.value||30); const since=new Date(Date.now()-days*DAY).toISOString(); const [p,i,o]=await Promise.all([sb.from('products').select('*').limit(5000),sb.from('order_items').select('*').gte('created_at',since).limit(10000),sb.from('orders').select('*').gte('created_at',since).limit(5000)]); products=p.data||[]; orders=(o.data||[]).filter(isRevenueOrder); const validIds=new Set(orders.map(x=>x.id)); items=(i.data||[]).filter(x=>validIds.has(x.order_id)); renderIntelligence(days);}
function productSales(){const map={}; items.forEach(i=>{const id=i.product_id||i.product_name; if(!map[id])map[id]={id,name:i.product_name||'Unknown',brand:i.brand||'',qty:0,total:0}; map[id].qty+=Number(i.quantity||0); map[id].total+=Number(i.line_total||0);}); return map;}
function renderIntelligence(days){ const sales=productSales(); const active=products.filter(p=>(p.status||'active')!=='hidden'); const fast=active.map(p=>({...p,sold:sales[p.id]?.qty||0,revenue:sales[p.id]?.total||0})).filter(p=>p.sold>=3).sort((a,b)=>b.sold-a.sold).slice(0,10); const slow=active.map(p=>({...p,sold:sales[p.id]?.qty||0})).filter(p=>p.sold===0 && Number(p.stock||0)>0).sort((a,b)=>Number(b.stock||0)-Number(a.stock||0)).slice(0,10); const restock=active.map(p=>({...p,sold:sales[p.id]?.qty||0,daysLeft: (sales[p.id]?.qty||0)>0 ? Math.ceil(Number(p.stock||0)/((sales[p.id].qty||1)/days)) : null})).filter(p=>Number(p.stock||0)<=5 || (p.daysLeft!==null&&p.daysLeft<=14)).sort((a,b)=>(a.daysLeft||999)-(b.daysLeft||999)).slice(0,10); document.getElementById('fastCount').textContent=fast.length; document.getElementById('slowCount').textContent=slow.length; document.getElementById('restockCount').textContent=restock.length;
 document.getElementById('fastList').innerHTML=fast.map(p=>`<div class='stat-row'><span><strong>${esc(p.name)}</strong><div class='muted'>${esc(p.brand||'')} · ${p.sold} sold</div></span><strong>${fmtMoney(p.revenue)}</strong></div>`).join('')||'<div class="empty compact">No fast movers yet.</div>';
 document.getElementById('slowList').innerHTML=slow.map(p=>`<div class='stat-row'><span><strong>${esc(p.name)}</strong><div class='muted'>${esc(p.brand||'')} · ${p.stock||0} in stock</div></span><span class='badge amber'>No sales</span></div>`).join('')||'<div class="empty compact">No slow movers detected.</div>';
 document.getElementById('restockList').innerHTML=restock.map(p=>`<div class='stat-row'><span><strong>${esc(p.name)}</strong><div class='muted'>${esc(p.brand||'')} · ${p.stock||0} left</div></span><span class='badge ${Number(p.stock||0)<=0?'red':'amber'}'>${p.daysLeft?`${p.daysLeft} days`:'Restock'}</span></div>`).join('')||'<div class="empty compact">No urgent restock suggestions.</div>';
 const revenue=orders.reduce((s,o)=>s+Number(o.total||0),0); const top=fast[0]; const firstRestock=restock[0]; insightsText=`Dzetshal AI Business Insights\n\nPeriod: Last ${days} days\nRevenue: ${fmtMoney(revenue)}\nOrders: ${orders.length}\nFast movers: ${fast.length}\nSlow movers: ${slow.length}\nRestock alerts: ${restock.length}\n\n${top?`Top fast seller: ${top.name} (${top.sold} sold).`:"No fast seller detected yet."}\n${firstRestock?`Priority restock: ${firstRestock.name} has ${firstRestock.stock||0} left.`:"No urgent restock action required."}\n\nSuggested action: ${firstRestock?`Restock ${firstRestock.name} and consider featuring ${top?.name||'your best seller'} on the homepage.`:'Focus on collecting more orders so the system can generate stronger predictions.'}`;
 document.getElementById('executiveSummary').textContent=insightsText; }
