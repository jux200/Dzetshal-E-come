
let allOrders=[], allItems=[], allProducts=[], periodOrders=[], filteredOrders=[], filteredItems=[], charts=[];

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

const DAY=24*60*60*1000;
function esc(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
function asDate(v){const d=new Date(v||Date.now()); return isNaN(d)?new Date():d;}
function dayKey(d){return asDate(d).toISOString().slice(0,10);}
function customerKey(o){return (o.customer_email||o.customer_phone||o.customer_name||'').toLowerCase().trim() || o.id;}
function getRange(){
  const sel=document.getElementById('rangeSelect')?.value||'30'; const now=new Date(); let from,to=new Date();
  if(sel==='custom'){
    from=document.getElementById('dateFrom')?.value?new Date(document.getElementById('dateFrom').value):new Date(now.getTime()-29*DAY);
    to=document.getElementById('dateTo')?.value?new Date(document.getElementById('dateTo').value):now;
  }else{ from=new Date(now.getTime()-(Number(sel)-1)*DAY); }
  from.setHours(0,0,0,0); to.setHours(23,59,59,999); return {from,to,days:Math.max(1,Math.ceil((to-from)/DAY)+1)};
}
document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('rangeSelect')?.addEventListener('change',()=>{const c=document.getElementById('rangeSelect').value==='custom'; document.getElementById('dateFrom')?.classList.toggle('hidden-control',!c); document.getElementById('dateTo')?.classList.toggle('hidden-control',!c);});
  document.getElementById('applyRange')?.addEventListener('click',renderAnalytics);
  document.getElementById('refreshBtn')?.addEventListener('click',loadAnalytics);
  document.getElementById('exportAnalytics')?.addEventListener('click',exportAnalyticsCSV);
  loadAnalytics();
});
async function loadAnalytics(){
  if(!await requireAdmin())return;
  const [ordersRes, itemsRes, productsRes] = await Promise.all([
    sb.from('orders').select('*').order('created_at',{ascending:false}).limit(5000),
    sb.from('order_items').select('*').limit(10000),
    sb.from('products').select('*').limit(5000)
  ]);
  if(ordersRes.error) toast(ordersRes.error.message);
  if(itemsRes.error) console.warn(itemsRes.error.message);
  if(productsRes.error) toast(productsRes.error.message);
  allOrders=ordersRes.data||[]; allItems=itemsRes.data||[]; allProducts=productsRes.data||[];
  renderAnalytics();
}
function renderAnalytics(){
  const {from,to,days}=getRange();
  periodOrders=allOrders.filter(o=>{const d=asDate(o.created_at);return d>=from&&d<=to;});
  filteredOrders=periodOrders.filter(isRevenueOrder);
  const ids=new Set(filteredOrders.map(o=>o.id));
  filteredItems=allItems.filter(i=>ids.has(i.order_id));
  renderKpis(days); renderRevenueChart(from,days); renderStatusChart(); renderTopProducts(); renderTopBrands(); renderTopCustomers(); renderInsights(days);
}
function clearCharts(){charts.forEach(c=>{try{c.destroy()}catch(e){}}); charts=[];}
function renderKpis(days){
  const total=filteredOrders.reduce((s,o)=>s+Number(o.total||0),0);
  const avg=filteredOrders.length?total/filteredOrders.length:0;
  const customers={}; filteredOrders.forEach(o=>{const k=customerKey(o); customers[k]=(customers[k]||0)+1;});
  const repeat=Object.values(customers).filter(n=>n>1).length; const repeatPct=Object.keys(customers).length?repeat/Object.keys(customers).length*100:0;
  const low=allProducts.filter(p=>Number(p.stock||0)>0&&Number(p.stock||0)<=5&&(p.status||'active')!=='hidden').length;
  const out=allProducts.filter(p=>Number(p.stock||0)<=0&&(p.status||'active')!=='hidden').length;
  const active=allProducts.filter(p=>(p.status||'active')!=='hidden').length;
  const health=active?Math.round(((active-low-out)/active)*100):0;
  document.getElementById('totalRevenue').textContent=fmtMoney(total);
  document.getElementById('totalOrders').textContent=filteredOrders.length;
  document.getElementById('averageOrder').textContent=fmtMoney(avg);
  document.getElementById('repeatCustomers').textContent=Math.round(repeatPct)+'%';
  document.getElementById('inventoryValue').textContent=fmtMoney(allProducts.reduce((s,p)=>s+Number(p.price||0)*Number(p.stock||0),0));
  document.getElementById('lowStockCount').textContent=low; document.getElementById('outStockCount').textContent=out; document.getElementById('healthScore').textContent=Math.max(0,health)+'%';
  document.getElementById('revenueSub').textContent=`Last ${days} day${days===1?'':'s'}`; document.getElementById('ordersSub').textContent=`${filteredOrders.length} order${filteredOrders.length===1?'':'s'}`;
}
function renderRevenueChart(from,days){
  const labels=[...Array(days)].map((_,i)=>{const d=new Date(from.getTime()+i*DAY); return dayKey(d)});
  const vals=labels.map(day=>filteredOrders.filter(o=>dayKey(o.created_at)===day).reduce((s,o)=>s+Number(o.total||0),0));
  const prevTotal=vals.slice(0,Math.floor(vals.length/2)).reduce((a,b)=>a+b,0); const recentTotal=vals.slice(Math.floor(vals.length/2)).reduce((a,b)=>a+b,0);
  const diff=prevTotal?Math.round((recentTotal-prevTotal)/prevTotal*100):recentTotal?100:0;
  document.getElementById('trendInsight').textContent=diff>0?`Revenue up ${diff}% in recent period`:diff<0?`Revenue down ${Math.abs(diff)}% in recent period`:'Revenue stable';
  clearCharts();
  const c=document.getElementById('analyticsRevenue');
  if(window.Chart&&c){charts.push(new Chart(c,{type:'line',data:{labels:labels.map(d=>d.slice(5)),datasets:[{label:'Revenue',data:vals,tension:.35,fill:true,borderWidth:3}]},options:{plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>fmtMoney(x.parsed.y)}}},scales:{y:{ticks:{callback:v=>'RWF '+Number(v).toLocaleString()}},x:{grid:{display:false}}}}}));}
}
function renderStatusChart(){ const map={}; periodOrders.forEach(o=>{const s=o.status||'pending'; map[s]=(map[s]||0)+1}); const c=document.getElementById('statusChart'); if(window.Chart&&c){charts.push(new Chart(c,{type:'doughnut',data:{labels:Object.keys(map),datasets:[{data:Object.values(map)}]},options:{plugins:{legend:{position:'bottom'}}}}));}}
function renderTopProducts(){ const map={}; filteredItems.forEach(i=>{const n=i.product_name||'Unknown'; if(!map[n]) map[n]={qty:0,total:0,brand:i.brand||''}; map[n].qty+=Number(i.quantity||0); map[n].total+=Number(i.line_total||0);}); const rows=Object.entries(map).sort((a,b)=>b[1].total-a[1].total).slice(0,10); document.getElementById('topProducts').innerHTML=rows.map(([n,v],i)=>`<div class='stat-row'><span><strong>#${i+1} ${esc(n)}</strong><div class='muted'>${esc(v.brand)}</div></span><span class='right'>${v.qty} sold<br><strong>${fmtMoney(v.total)}</strong></span></div>`).join('')||'<div class="empty compact">No sales yet.</div>';}
function renderTopBrands(){ const map={}; filteredItems.forEach(i=>{const n=i.brand||'Unknown'; if(!map[n]) map[n]={qty:0,total:0}; map[n].qty+=Number(i.quantity||0); map[n].total+=Number(i.line_total||0);}); const rows=Object.entries(map).sort((a,b)=>b[1].total-a[1].total).slice(0,10); document.getElementById('topBrands').innerHTML=rows.map(([n,v],i)=>`<div class='stat-row'><span><strong>#${i+1} ${esc(n)}</strong><div class='muted'>${v.qty} items</div></span><strong>${fmtMoney(v.total)}</strong></div>`).join('')||'<div class="empty compact">No brand data yet.</div>';}
function renderTopCustomers(){ const map={}; filteredOrders.forEach(o=>{const k=customerKey(o); if(!map[k]) map[k]={name:o.customer_name||'Customer',phone:o.customer_phone||'',email:o.customer_email||'',orders:0,total:0}; map[k].orders++; map[k].total+=Number(o.total||0);}); const rows=Object.values(map).sort((a,b)=>b.total-a.total).slice(0,10); document.getElementById('topCustomers').innerHTML=rows.map((c,i)=>`<div class='stat-row'><span><strong>#${i+1} ${esc(c.name)}</strong><div class='muted'>${esc(c.email||c.phone)}</div></span><span class='right'>${c.orders} orders<br><strong>${fmtMoney(c.total)}</strong></span></div>`).join('')||'<div class="empty compact">No customer data yet.</div>';}
function renderInsights(days){ const total=filteredOrders.reduce((s,o)=>s+Number(o.total||0),0); const low=allProducts.filter(p=>Number(p.stock||0)>0&&Number(p.stock||0)<=5); const out=allProducts.filter(p=>Number(p.stock||0)<=0); const top=[...document.querySelectorAll('#topProducts .stat-row strong')][0]?.textContent?.replace(/^#\d+ /,'')||'No best seller yet'; const insights=[{t:'Revenue Summary',v:`${fmtMoney(total)} from ${filteredOrders.length} orders in the selected ${days}-day period.`},{t:'Best Seller',v:`${top} is currently your leading product for this period.`},{t:'Stock Alert',v:`${low.length} products are low stock and ${out.length} products are out of stock.`},{t:'Next Action',v:low.length?`Restock ${low[0].name} first because it has only ${low[0].stock} left.`:'Inventory health looks good for now.'}]; document.getElementById('analyticsInsights').innerHTML=insights.map(x=>`<div class='insight-card'><strong>${esc(x.t)}</strong><p>${esc(x.v)}</p></div>`).join('');}
function exportAnalyticsCSV(){ const rows=[['Metric','Value'],['Revenue',filteredOrders.reduce((s,o)=>s+Number(o.total||0),0)],['Orders',filteredOrders.length],['Average order',filteredOrders.length?filteredOrders.reduce((s,o)=>s+Number(o.total||0),0)/filteredOrders.length:0],['Low stock',allProducts.filter(p=>Number(p.stock||0)>0&&Number(p.stock||0)<=5).length],['Out of stock',allProducts.filter(p=>Number(p.stock||0)<=0).length]]; const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='dzetshal-analytics.csv'; a.click();}
