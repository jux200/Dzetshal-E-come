let orders=[], products=[], items=[], revenueChartInstance=null;

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

document.addEventListener('DOMContentLoaded',()=>{loadDashboard(); document.getElementById('refreshBtn')?.addEventListener('click',loadDashboard); try{sb.channel('orders-live-dashboard').on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>loadDashboard()).on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>loadDashboard()).subscribe();}catch(e){}});
async function loadDashboard(){
  await requireAdmin();
  const [{data:o,error:oe},{data:p,error:pe},{data:i,error:ie}] = await Promise.all([
    sb.from('orders').select('*').order('created_at',{ascending:false}).limit(300),
    sb.from('products').select('*').order('created_at',{ascending:false}),
    sb.from('order_items').select('*').limit(1000)
  ]);
  if(oe||pe) toast((oe||pe).message);
  orders=o||[]; products=p||[]; items=i||[];
  renderStats(); renderRecent(); renderBest(); renderAlerts(); renderRevenueChart();
}
function uniqueCustomers(){
  const set=new Set();
  orders.filter(o=>!isTerminalOrder(o)).forEach(o=>set.add(o.customer_email||o.customer_phone||o.customer_name||o.id));
  return set.size;
}
function renderStats(){
  const today=new Date().toISOString().slice(0,10);
  const todayValidOrders=orders.filter(o=>!isTerminalOrder(o)&&(o.created_at||'').slice(0,10)===today);
  const todayRevenueOrders=todayValidOrders.filter(isRevenueOrder);
  const realizedOrders=orders.filter(isRevenueOrder);
  const rev=todayRevenueOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const avg=realizedOrders.length?realizedOrders.reduce((s,o)=>s+Number(o.total||0),0)/realizedOrders.length:0;
  document.getElementById('todayRevenue').textContent=fmtMoney(rev);
  document.getElementById('ordersToday').textContent=todayValidOrders.length;
  document.getElementById('todayOrdersText').textContent=`${todayValidOrders.length} valid order${todayValidOrders.length===1?'':'s'} today`;
  document.getElementById('pendingOrders').textContent=orders.filter(o=>!isTerminalOrder(o)&&normalizedOrderStatus(o)==='pending').length;
  document.getElementById('totalProducts').textContent=products.filter(p=>(p.status||'active')==='active').length;
  document.getElementById('totalCustomers').textContent=uniqueCustomers();
  document.getElementById('avgOrder').textContent=fmtMoney(avg);
  document.getElementById('lowStock').textContent=products.filter(p=>Number(p.stock||0)>0 && Number(p.stock||0)<=5).length;
  document.getElementById('outStock').textContent=products.filter(p=>Number(p.stock||0)<=0).length;
}
function renderRecent(){
  const box=document.getElementById('recentOrders'); box.innerHTML='';
  orders.slice(0,7).forEach(o=>{box.innerHTML+=`<div class='stat-row'><div><strong>${o.order_number||'Order'}</strong><div class='muted'>${o.customer_name||'Customer'} · ${new Date(o.created_at).toLocaleDateString()}</div></div><div class='right'><strong>${fmtMoney(o.total)}</strong><br><span class='badge ${badge(o.status)}'>${o.status||'pending'}</span></div></div>`});
  if(!box.innerHTML) box.innerHTML='<div class="empty compact">No orders yet.</div>';
}
function renderBest(){
  const revenueOrderIds=new Set(orders.filter(isRevenueOrder).map(o=>o.id));
  const counts={}; items.filter(i=>revenueOrderIds.has(i.order_id)).forEach(i=>{const k=i.product_name||'Unknown'; if(!counts[k]) counts[k]={qty:0,total:0,brand:i.brand||''}; counts[k].qty+=Number(i.quantity||0); counts[k].total+=Number(i.line_total||0);});
  const rows=Object.entries(counts).sort((a,b)=>b[1].qty-a[1].qty).slice(0,7);
  document.getElementById('bestSellers').innerHTML=rows.map(([name,v],idx)=>`<div class='stat-row'><span><strong>#${idx+1} ${name}</strong><div class='muted'>${v.brand||''}</div></span><span class='right'><strong>${v.qty} sold</strong><div class='muted'>${fmtMoney(v.total)}</div></span></div>`).join('')||'<div class="empty compact">No sales data yet.</div>';
}
function renderAlerts(){
  const lows=products.filter(p=>Number(p.stock||0)<=5 && (p.status||'active')!=='hidden').sort((a,b)=>Number(a.stock||0)-Number(b.stock||0)).slice(0,9);
  document.getElementById('inventoryAlerts').innerHTML=lows.map(p=>`<div class='stat-row'><span><strong>${p.name}</strong><div class='muted'>${p.brand||''}</div></span><span class='badge ${Number(p.stock||0)<=0?'red':'amber'}'>${p.stock||0} left</span></div>`).join('')||'<div class="empty compact">No low stock products.</div>';
}
function renderRevenueChart(){
  const days=[...Array(14)].map((_,i)=>{const d=new Date(); d.setDate(d.getDate()-(13-i)); return d.toISOString().slice(0,10)});
  const vals=days.map(day=>orders.filter(o=>isRevenueOrder(o)&&(o.created_at||'').slice(0,10)===day).reduce((s,o)=>s+Number(o.total||0),0));
  const labels=days.map(d=>d.slice(5));
  const fallback=document.getElementById('revenueChart');
  fallback.innerHTML=vals.map((v,i)=>`<div class='bar' style='height:${Math.max(8,v/Math.max(...vals,1)*100)}%'><span>${labels[i]}</span></div>`).join('');
  const canvas=document.getElementById('revenueCanvas');
  if(!window.Chart||!canvas) return;
  fallback.style.display='none';
  if(revenueChartInstance) revenueChartInstance.destroy();
  revenueChartInstance=new Chart(canvas,{type:'line',data:{labels,datasets:[{label:'Revenue',data:vals,tension:.35,fill:true,borderWidth:3}]},options:{responsive:true,plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>fmtMoney(ctx.parsed.y)}}},scales:{y:{ticks:{callback:v=>'RWF '+Number(v).toLocaleString()}},x:{grid:{display:false}}}}});
}
function badge(s){return s==='delivered'?'green':s==='cancelled'?'red':s==='confirmed'||s==='preparing'||s==='shipped'?'blue':'amber'}
