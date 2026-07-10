let movements=[];
let invProducts=[];
function esc(value){return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
document.addEventListener('DOMContentLoaded',()=>{loadInventory(); document.getElementById('refreshBtn')?.addEventListener('click',loadInventory); document.getElementById('inventorySearch')?.addEventListener('input',renderInventory); document.getElementById('movementFilter')?.addEventListener('change',renderInventory); document.getElementById('exportBtn')?.addEventListener('click',exportCSV);});
async function loadInventory(){ if(!await requireAdmin())return; const [{data:m,error:me},{data:p,error:pe}]=await Promise.all([sb.from('inventory_history').select('*').order('created_at',{ascending:false}).limit(1000), sb.from('products').select('id,name,brand,price,stock,status').order('stock',{ascending:true}).limit(1000)]); if(me){toast(me.message)} movements=m||[]; invProducts=p||[]; renderStats(); renderInventory(); renderLowStock(); renderInventoryInsights(); }
function renderStats(){ const low=invProducts.filter(p=>Number(p.stock||0)>0&&Number(p.stock||0)<=5&&(p.status||'active')!=='hidden'); const out=invProducts.filter(p=>Number(p.stock||0)<=0&&(p.status||'active')!=='hidden'); const val=invProducts.reduce((s,p)=>s+Number(p.price||0)*Number(p.stock||0),0); document.getElementById('lowStockCount').textContent=low.length; document.getElementById('outStockCount').textContent=out.length; document.getElementById('inventoryValue').textContent=fmtMoney(val); }
function filtered(){ const q=(document.getElementById('inventorySearch')?.value||'').toLowerCase(); const f=document.getElementById('movementFilter')?.value||''; return movements.filter(m=>(!f||String(m.reason||m.change_type||'')===f)&&`${m.product_name||''} ${m.brand||''} ${m.reason||''} ${m.note||''}`.toLowerCase().includes(q));}
function renderInventory(){ const rows=filtered(); document.getElementById('inventoryTable').innerHTML=rows.map(m=>`<tr><td>${new Date(m.created_at).toLocaleString()}</td><td><strong>${esc(m.product_name||'Product')}</strong><div class='muted'>${esc(m.brand||'')}</div></td><td><span class='badge ${Number(m.change_amount||0)<0?'red':'green'}'>${Number(m.change_amount||0)>0?'+':''}${Number(m.change_amount||0)}</span></td><td>${Number(m.quantity_before||0)}</td><td>${Number(m.quantity_after||0)}</td><td>${esc(m.reason||m.change_type||'')}</td><td>${esc(m.changed_by||'')}</td></tr>`).join('')||`<tr><td colspan='7' class='empty'>No inventory movements yet.</td></tr>`;}
function renderLowStock(){ const lows=invProducts.filter(p=>Number(p.stock||0)<=5&&(p.status||'active')!=='hidden').sort((a,b)=>Number(a.stock||0)-Number(b.stock||0)).slice(0,20); document.getElementById('lowStockList').innerHTML=lows.map(p=>`<div class='stat-row'><span><strong>${esc(p.name)}</strong><div class='muted'>${esc(p.brand||'')}</div></span><span class='badge ${Number(p.stock||0)<=0?'red':'amber'}'>${Number(p.stock||0)} left</span></div>`).join('')||`<div class='empty compact'>No low stock products.</div>`;}
function exportCSV(){ const rows=[['Date','Product','Brand','Change','Before','After','Reason','Note','Admin'],...filtered().map(m=>[m.created_at,m.product_name,m.brand,m.change_amount,m.quantity_before,m.quantity_after,m.reason||m.change_type,m.note,m.changed_by])]; const csv=rows.map(r=>r.map(v=>`"${String(v||'').replaceAll('"','""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='dzetshal-inventory.csv'; a.click();}

function renderInventoryInsights(){
  const box=document.getElementById('inventoryInsights'); if(!box)return;
  const low=invProducts.filter(p=>Number(p.stock||0)>0&&Number(p.stock||0)<=5&&(p.status||'active')!=='hidden').sort((a,b)=>Number(a.stock||0)-Number(b.stock||0));
  const out=invProducts.filter(p=>Number(p.stock||0)<=0&&(p.status||'active')!=='hidden');
  const value=invProducts.reduce((s,p)=>s+Number(p.price||0)*Number(p.stock||0),0);
  const highValue=invProducts.filter(p=>Number(p.stock||0)>0).sort((a,b)=>(Number(b.price||0)*Number(b.stock||0))-(Number(a.price||0)*Number(a.stock||0))).slice(0,1)[0];
  const items=[
    {t:'Inventory Value',v:`Current stock value is ${fmtMoney(value)}.`},
    {t:'Low Stock Priority',v:low[0]?`${low[0].name} needs attention first (${low[0].stock} left).`:'No urgent low-stock priority.'},
    {t:'Out of Stock',v:`${out.length} product${out.length===1?'':'s'} currently out of stock.`},
    {t:'Capital Tied in Stock',v:highValue?`${highValue.name} has the highest stock value (${fmtMoney(Number(highValue.price||0)*Number(highValue.stock||0))}).`:'No stock value detected.'}
  ];
  box.innerHTML=items.map(x=>`<div class='insight-card'><strong>${esc(x.t)}</strong><p>${esc(x.v)}</p></div>`).join('');
}
