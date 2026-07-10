let allOrders = [];
let orderItemsByOrder = {};
let currentOrderId = null;

const ORDER_STEPS = ['pending','confirmed','preparing','ready','out_for_delivery','delivered'];
const ALL_STATUSES = ['pending','confirmed','preparing','ready','out_for_delivery','shipped','delivered','cancelled'];

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


function esc(value){
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}
function niceStatus(status){ return String(status || 'pending').replaceAll('_',' '); }
function statusClass(status){
  const s = String(status || 'pending');
  if(s === 'delivered') return 'green';
  if(s === 'cancelled') return 'red';
  if(['confirmed','preparing','ready','out_for_delivery','shipped'].includes(s)) return 'blue';
  return 'amber';
}
function orderKey(o){ return (o.order_number || (o.id || '').slice(0,8) || 'Order'); }
function orderItemsText(order, items){
  if(items && items.length){
    return items.map(i => `${i.product_name || 'Product'} x${i.quantity || 1}`).join('; ');
  }
  if(Array.isArray(order.items)) return order.items.map(i => `${i.name || i.product_name || 'Product'} x${i.qty || i.quantity || 1}`).join('; ');
  if(order.items && typeof order.items === 'object') return JSON.stringify(order.items);
  return '';
}

function bindFilters(){
  ['orderSearch','statusFilter','paymentFilter','fromDate','toDate'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.oninput = renderOrders;
    if(el) el.onchange = renderOrders;
  });
  document.getElementById('refreshBtn')?.addEventListener('click', loadOrders);
  document.getElementById('exportBtn')?.addEventListener('click', exportCSV);
  document.getElementById('closeOrderModal')?.addEventListener('click', closeOrderModal);
  document.getElementById('printInvoiceBtn')?.addEventListener('click', printCurrentInvoice);
  document.getElementById('saveNoteBtn')?.addEventListener('click', saveOrderNote);
}

document.addEventListener('DOMContentLoaded', async () => {
  bindFilters();
  await loadOrders();
  try{
    sb.channel('orders-live-sprint3')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'}, loadOrders)
      .on('postgres_changes',{event:'*',schema:'public',table:'order_items'}, loadOrders)
      .subscribe();
  }catch(e){}
});

async function loadOrders(){
  if(!await requireAdmin()) return;
  const {data,error}=await sb.from('orders').select('*').order('created_at',{ascending:false}).limit(1000);
  if(error){ toast(error.message); return; }
  allOrders = data || [];
  await loadOrderItems();
  renderOrders();
}

async function loadOrderItems(){
  orderItemsByOrder = {};
  const ids = allOrders.map(o => o.id).filter(Boolean);
  if(!ids.length) return;
  const {data,error}=await sb.from('order_items').select('*').in('order_id', ids);
  if(error){ console.warn(error); return; }
  (data || []).forEach(item => {
    (orderItemsByOrder[item.order_id] ||= []).push(item);
  });
}

function filteredOrders(){
  const q = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();
  const status = document.getElementById('statusFilter')?.value || '';
  const payment = document.getElementById('paymentFilter')?.value || '';
  const from = document.getElementById('fromDate')?.value || '';
  const to = document.getElementById('toDate')?.value || '';
  return allOrders.filter(o => {
    const st = String(o.status || 'pending');
    const pay = String(o.payment_method || '').toLowerCase();
    const created = String(o.created_at || '').slice(0,10);
    const itemsText = orderItemsText(o, orderItemsByOrder[o.id] || []);
    const hay = `${o.order_number||''} ${o.customer_name||''} ${o.customer_phone||''} ${o.customer_email||''} ${o.city||''} ${itemsText}`.toLowerCase();
    return (!q || hay.includes(q)) &&
           (!status || st === status) &&
           (!payment || pay.includes(payment.toLowerCase())) &&
           (!from || created >= from) &&
           (!to || created <= to);
  });
}

function renderOrders(){
  const rows = filteredOrders();
  const body = document.getElementById('ordersTable');
  if(!body) return;
  document.getElementById('ordersCount') && (document.getElementById('ordersCount').textContent = `${rows.length} order${rows.length===1?'':'s'}`);
  body.innerHTML = rows.map(o => {
    const items = orderItemsByOrder[o.id] || [];
    return `<tr>
      <td><strong>${esc(orderKey(o))}</strong><div class='muted'>${new Date(o.created_at).toLocaleString()}</div></td>
      <td><strong>${esc(o.customer_name || 'Customer')}</strong><div class='muted'>${esc(o.customer_phone||'')}<br>${esc(o.customer_email||'')}</div></td>
      <td>${esc(o.city||'')}<div class='muted'>${esc(o.country||'')}</div></td>
      <td>${items.length || (Array.isArray(o.items)?o.items.length:'')} item${(items.length||0)===1?'':'s'}<div class='muted truncate'>${esc(orderItemsText(o, items))}</div></td>
      <td><strong>${fmtMoney(o.total)}</strong><div class='muted'>${esc(o.payment_method||'')}</div></td>
      <td><span class='badge ${statusClass(o.status)}'>${esc(niceStatus(o.status))}</span></td>
      <td class='actions'><button class='btn outline small' onclick='viewOrder("${o.id}")'>View</button>${isTerminalOrder(o)||normalizedOrderStatus(o)==='delivered'?'':`<button class='btn primary small' onclick='quickAdvance("${o.id}")'>Next</button>`}</td>
    </tr>`;
  }).join('') || `<tr><td colspan='7' class='empty'>No orders found.</td></tr>`;
}

async function quickAdvance(id){
  const order = allOrders.find(o => o.id === id);
  if(!order) return;
  const current = String(order.status || 'pending');
  if(current === 'cancelled' || current === 'delivered'){ toast('This order is already closed.'); return; }
  const idx = ORDER_STEPS.indexOf(current);
  const next = ORDER_STEPS[Math.min(idx + 1, ORDER_STEPS.length - 1)] || 'confirmed';
  await updateOrderStatus(id, next);
}

async function viewOrder(id){
  currentOrderId = id;
  const order = allOrders.find(o => o.id === id);
  if(!order) return;
  document.getElementById('orderTitle').textContent = orderKey(order);
  await renderOrderModal(order);
  document.getElementById('orderModal').classList.add('open');
}

async function renderOrderModal(order){
  const items = orderItemsByOrder[order.id] || [];
  const [{data:history},{data:notes}] = await Promise.all([
    sb.from('order_status_history').select('*').eq('order_id',order.id).order('created_at',{ascending:true}),
    sb.from('order_notes').select('*').eq('order_id',order.id).order('created_at',{ascending:false})
  ]);
  document.getElementById('orderDetails').innerHTML = `
    <div class='order-detail-grid'>
      <section class='detail-card'>
        <h3>Customer</h3>
        <p><strong>${esc(order.customer_name || 'Customer')}</strong><br>${esc(order.customer_email||'')}<br>${esc(order.customer_phone||'')}</p>
      </section>
      <section class='detail-card'>
        <h3>Delivery</h3>
        <p>${esc(order.address||'')}<br>${esc(order.city||'')}${order.city && order.country?', ':''}${esc(order.country||'')}</p>
      </section>
      <section class='detail-card'>
        <h3>Payment</h3>
        <p><strong>${fmtMoney(order.total)}</strong><br>${esc(order.payment_method||'Not specified')}<br>${esc(order.payment_status||'Pending')}</p>
      </section>
    </div>
    <section class='detail-card full'>
      <div class='section-head-row'><h3>Status Timeline</h3><span class='badge ${statusClass(order.status)}'>${esc(niceStatus(order.status))}</span></div>
      <div class='timeline-actions'>${ALL_STATUSES.map(s => {
        const locked=isTerminalOrder(order) && normalizedOrderStatus(order)!==s;
        return `<button class='status-chip ${normalizedOrderStatus(order)===s?'active':''}' ${locked?'disabled title="Cancelled/refunded orders are terminal"':''} onclick='${locked?'return false':`updateOrderStatus("${order.id}","${s}")`}'>${esc(niceStatus(s))}</button>`;
      }).join('')}</div>
      <div class='timeline'>${renderTimeline(order.status, history || [])}</div>
    </section>
    <section class='detail-card full'>
      <h3>Items</h3>
      <div class='stat-list'>${items.length ? items.map(i=>`<div class='stat-row'><span><strong>${esc(i.product_name||'Product')}</strong><div class='muted'>${esc(i.brand||'')} · ${esc(i.size||'')}</div></span><span class='right'><strong>${Number(i.quantity||1)} × ${fmtMoney(i.unit_price)}</strong><div class='muted'>${fmtMoney(i.line_total)}</div></span></div>`).join('') : `<div class='empty compact'>No item rows saved. Raw order data is shown below.<pre>${esc(JSON.stringify(order.items||{},null,2))}</pre></div>`}</div>
      <div class='invoice-total'><span>Total</span><strong>${fmtMoney(order.total)}</strong></div>
    </section>
    <section class='detail-card full'>
      <h3>Admin Notes</h3>
      <div class='note-box'>
        <textarea id='noteText' rows='3' placeholder='Add a note, for example: Customer requested delivery after 5 PM.'></textarea>
      </div>
      <div class='notes-list'>${(notes||[]).map(n=>`<div class='note-item'><strong>${esc(n.created_by||'Admin')}</strong><span>${new Date(n.created_at).toLocaleString()}</span><p>${esc(n.note)}</p></div>`).join('') || `<div class='muted'>No notes yet.</div>`}</div>
    </section>`;
}

function renderTimeline(currentStatus, history){
  const current = String(currentStatus || 'pending');
  const currentIndex = ORDER_STEPS.indexOf(current);
  const steps = ORDER_STEPS.map((s, idx) => `<div class='timeline-step ${idx <= currentIndex ? 'done' : ''}'><span>${idx <= currentIndex ? '✓' : '○'}</span><strong>${esc(niceStatus(s))}</strong></div>`).join('');
  const hist = (history || []).map(h => `<div class='history-row'><span>${new Date(h.created_at).toLocaleString()}</span><strong>${esc(niceStatus(h.status))}</strong><em>${esc(h.changed_by||'Admin')}</em></div>`).join('');
  return `<div class='timeline-steps'>${steps}</div><div class='history-list'>${hist || '<div class="muted">No status history yet.</div>'}</div>`;
}

async function updateOrderStatus(id, status){
  const order=allOrders.find(o=>o.id===id);
  if(!order) return;
  if(isTerminalOrder(order) && normalizedOrderStatus(order)!==String(status).toLowerCase()){
    toast('Cancelled/refunded orders are terminal and cannot be reopened.');
    return;
  }
  if(['cancelled','canceled','refunded'].includes(String(status).toLowerCase()) && !isTerminalOrder(order)){
    if(!window.confirm('Cancel this order? Its stock will be restored and it will be removed from Dispatch and revenue analytics.')) return;
  }
  const {error} = await sb.from('orders').update({status, delivery_status: status, updated_at:new Date().toISOString()}).eq('id', id);
  if(error){ toast(error.message); return; }
  try{
    const session = await getSession();
    await sb.from('order_status_history').insert({order_id:id,status,changed_by:session?.user?.email || 'admin'});
  }catch(e){}
  if(order){ order.status = status; order.delivery_status = status; order.updated_at = new Date().toISOString(); }
  renderOrders();
  if(currentOrderId === id){ await renderOrderModal(order); }
  toast('Order status updated');
}

async function saveOrderNote(){
  if(!currentOrderId) return;
  const note = document.getElementById('noteText')?.value.trim();
  if(!note){ toast('Write a note first.'); return; }
  const session = await getSession();
  const {error} = await sb.from('order_notes').insert({order_id:currentOrderId,note,created_by:session?.user?.email || 'admin'});
  if(error){ toast(error.message); return; }
  const order = allOrders.find(o=>o.id===currentOrderId);
  await renderOrderModal(order);
  toast('Note saved');
}

function closeOrderModal(){
  currentOrderId = null;
  document.getElementById('orderModal')?.classList.remove('open');
}

function printCurrentInvoice(){
  if(!currentOrderId) return;
  const order = allOrders.find(o=>o.id===currentOrderId);
  if(!order) return;
  const items = orderItemsByOrder[order.id] || [];
  const w = window.open('', '_blank');
  const itemRows = items.length ? items.map(i=>`<tr><td>${esc(i.product_name||'Product')}<br><small>${esc(i.brand||'')} ${esc(i.size||'')}</small></td><td>${Number(i.quantity||1)}</td><td>${fmtMoney(i.unit_price)}</td><td>${fmtMoney(i.line_total)}</td></tr>`).join('') : `<tr><td colspan='4'>${esc(orderItemsText(order, items) || 'No item rows saved')}</td></tr>`;
  w.document.write(`<!doctype html><html><head><title>Invoice ${esc(orderKey(order))}</title><style>body{font-family:Arial,sans-serif;color:#1a1a1a;padding:35px}.brand{color:#224C44;font-size:32px;font-family:serif;font-style:italic}.top{display:flex;justify-content:space-between;border-bottom:2px solid #224C44;padding-bottom:18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border-bottom:1px solid #ddd;padding:12px;text-align:left}th{background:#f5f3f0}.total{text-align:right;font-size:24px;color:#224C44;margin-top:20px}.muted{color:#666}button{display:none}@media print{body{padding:0}}</style></head><body><div class='top'><div><div class='brand'>Dzetshal</div><div class='muted'>Jardin de Beauté</div></div><div><h2>Invoice</h2><strong>${esc(orderKey(order))}</strong><br>${new Date(order.created_at).toLocaleString()}</div></div><h3>Customer</h3><p>${esc(order.customer_name||'')}<br>${esc(order.customer_email||'')}<br>${esc(order.customer_phone||'')}<br>${esc(order.address||'')} ${esc(order.city||'')} ${esc(order.country||'')}</p><table><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table><div class='total'>Total: ${fmtMoney(order.total)}</div><script>window.print();<\/script></body></html>`);
  w.document.close();
}

function exportCSV(){
  const rows = [['Order','Customer','Email','Phone','City','Country','Items','Payment','Total','Status','Date'], ...filteredOrders().map(o => [orderKey(o), o.customer_name, o.customer_email, o.customer_phone, o.city, o.country, orderItemsText(o, orderItemsByOrder[o.id] || []), o.payment_method, o.total, o.status, o.created_at])];
  const csv = rows.map(r => r.map(v => `"${String(v||'').replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download='dzetshal-orders.csv';
  a.click();
}
