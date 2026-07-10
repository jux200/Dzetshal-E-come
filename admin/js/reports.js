
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


let orders=[], products=[];
function escCSV(v){return `"${String(v??'').replaceAll('"','""')}"`;}
document.addEventListener('DOMContentLoaded',()=>{loadReports(); document.getElementById('refreshBtn')?.addEventListener('click',loadReports); document.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>downloadReport(b.dataset.report)));});
async function loadReports(){ if(!await requireAdmin())return; const [o,p]=await Promise.all([sb.from('orders').select('*').order('created_at',{ascending:false}).limit(5000),sb.from('products').select('*').limit(5000)]); orders=o.data||[]; products=p.data||[]; const now=new Date().toLocaleString(); const realized=orders.filter(isRevenueOrder); document.getElementById('reportPreview').innerHTML=`<tr><td>Realized sales</td><td>${realized.length}</td><td>${now}</td></tr><tr><td>Inventory</td><td>${products.length}</td><td>${now}</td></tr><tr><td>Customers</td><td>${uniqueCustomers().length}</td><td>${now}</td></tr>`;}
function uniqueCustomers(){const map={}; orders.filter(isRevenueOrder).forEach(o=>{const k=(o.customer_email||o.customer_phone||o.customer_name||o.id).toLowerCase(); if(!map[k])map[k]={name:o.customer_name,email:o.customer_email,phone:o.customer_phone,orders:0,total:0,last:''}; map[k].orders++; map[k].total+=Number(o.total||0); map[k].last=o.created_at;}); return Object.values(map);}
function saveCSV(name,rows){const csv=rows.map(r=>r.map(escCSV).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=name; a.click();}
function downloadReport(type){ if(type==='orders') return saveCSV('dzetshal-orders.csv',[['Order','Customer','Email','Phone','Status','Payment','Total','Date'],...orders.map(o=>[o.order_number,o.customer_name,o.customer_email,o.customer_phone,o.status,o.payment_method,o.total,o.created_at])]); if(type==='inventory') return saveCSV('dzetshal-inventory.csv',[['Name','Brand','Type','Gender','Price','Stock','Status','Inventory Value'],...products.map(p=>[p.name,p.brand,p.type,p.gender,p.price,p.stock,p.status,Number(p.price||0)*Number(p.stock||0)])]); if(type==='customers') return saveCSV('dzetshal-customers.csv',[['Customer','Email','Phone','Orders','Total Spent','Last Order'],...uniqueCustomers().map(c=>[c.name,c.email,c.phone,c.orders,c.total,c.last])]);}
