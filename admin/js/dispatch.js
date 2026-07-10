
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


let ORDERS=[];document.addEventListener('DOMContentLoaded',async()=>{if(!await requireAdmin())return;refreshBtn.onclick=loadDispatch;statusFilter.onchange=render;searchBox.oninput=render;await loadDispatch();});
async function loadDispatch(){
  const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(500);
  if(error){toast(error.message);return}
  const activeStatuses=new Set(['confirmed','preparing','ready','ready_for_pickup','out_for_delivery','sent_via_transport','shipped']);
  ORDERS=(data||[]).filter(o=>!isTerminalOrder(o)&&activeStatuses.has(normalizedOrderStatus(o)));
  render();
}
function render(){const q=(searchBox.value||'').toLowerCase(), st=statusFilter.value; const rows=ORDERS.filter(o=>(!st||(o.delivery_status||o.status)===st)&&(`${o.order_number||''} ${o.customer_name||''} ${o.customer_phone||''}`.toLowerCase().includes(q))); dispatchList.innerHTML=rows.map(o=>`<div class='dispatch-card'><div><strong>${o.order_number||'Order'}</strong> <span class='badge'>${o.delivery_status||o.status||'pending'}</span></div><div class='dispatch-meta'><div><small>Customer</small><br>${o.customer_name||''}<br>${o.customer_phone||''}</div><div><small>Method</small><br>${o.delivery_method||'pickup'}<br>${o.transport_destination||o.city||''}</div><div><small>Total</small><br>${fmtMoney(o.total)}</div><div><small>Payment</small><br>${o.payment_method||''}<br>${o.payment_status||'pending'}</div></div><div class='dispatch-actions'><button class='btn outline small' onclick="updateDelivery('${o.id}','ready_for_pickup')">Ready Pickup</button><button class='btn outline small' onclick="updateDelivery('${o.id}','sent_via_transport')">Sent Transport</button><button class='btn outline small' onclick="updateDelivery('${o.id}','delivered')">Delivered</button><button class='btn outline small' onclick="markPaid('${o.id}')">Mark Paid</button></div></div>`).join('')||`<div class='empty'>No dispatch orders found.</div>`;}
async function updateDelivery(id,status){
  const order=ORDERS.find(o=>o.id===id);
  if(!order || isTerminalOrder(order)){toast('Cancelled/refunded orders cannot be dispatched.');return}
  const {error}=await sb.from('orders').update({delivery_status:status,updated_at:new Date().toISOString()}).eq('id',id); if(error){toast(error.message);return} await logActivity('Updated delivery status','orders',id,{status}); toast('Delivery updated'); await loadDispatch();}
async function markPaid(id){
  const order=ORDERS.find(o=>o.id===id);
  if(!order || isTerminalOrder(order)){toast('Cancelled/refunded orders cannot be marked paid.');return}
  const {error}=await sb.from('orders').update({payment_status:'paid',updated_at:new Date().toISOString()}).eq('id',id); if(error){toast(error.message);return} await logActivity('Marked order paid','orders',id,{}); toast('Payment marked paid'); await loadDispatch();}
