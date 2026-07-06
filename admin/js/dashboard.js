
document.addEventListener('DOMContentLoaded', async()=>{ if(!await requireAdmin())return; loadDashboard(); });
async function loadDashboard(){
 const [{data:orders},{data:products}] = await Promise.all([
  sb.from('orders').select('*').order('created_at',{ascending:false}).limit(200),
  sb.from('products').select('*').order('created_at',{ascending:false}).limit(1000)
 ]);
 const ord=orders||[], prod=products||[];
 const revenue=ord.reduce((s,o)=>s+Number(o.total||0),0);
 document.getElementById('revenue').textContent=formatRwf(revenue);
 document.getElementById('ordersCount').textContent=ord.length;
 document.getElementById('productsCount').textContent=prod.length;
 const low=prod.filter(p=>Number(p.stock||0)<5);
 document.getElementById('lowStock').textContent=low.length;
 document.getElementById('recentOrders').innerHTML=ord.slice(0,8).map(o=>`<tr><td>${o.order_number||o.id?.slice(0,8)}</td><td>${o.customer_name||''}<br><span class='muted'>${o.customer_phone||''}</span></td><td>${formatRwf(o.total)}</td><td>${statusBadge(o.status||o.delivery_status)}</td><td>${fmtDate(o.created_at)}</td></tr>`).join('') || `<tr><td colspan='5'>No orders yet.</td></tr>`;
 document.getElementById('lowStockList').textContent=low.slice(0,10).map(p=>`${p.brand||''} ${p.name||''} - Stock: ${p.stock||0}`).join('\n') || 'No low stock products.';
}
