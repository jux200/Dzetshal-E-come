const fmtMoney = n => 'RWF ' + Number(n||0).toLocaleString();
const todayISO = () => new Date().toISOString();
function $(s){ return document.querySelector(s); }
function toast(msg){
  const t=document.getElementById('toast')||Object.assign(document.body.appendChild(document.createElement('div')),{id:'toast',className:'toast'});
  t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2800);
}
function setActive(page){ document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page)); }
async function getSession(){ const {data:{session}}=await sb.auth.getSession(); return session; }
async function requireAdmin(){
  const session=await getSession();
  if(!session){ location.href='login.html'; return null; }
  const email=session.user.email;
  const {data,error}=await sb.from('admin_users').select('*').eq('email',email).maybeSingle();
  if(error||!data){ await sb.auth.signOut(); alert('This email is not authorized as admin.'); location.href='login.html'; return null; }
  const el=document.getElementById('userEmail'); if(el) el.textContent=email;
  return {session,email,admin:data};
}
async function logout(){ await sb.auth.signOut(); location.href='login.html'; }
function initTheme(){
  const saved=localStorage.getItem('dzt_admin_theme')||'light';
  document.documentElement.dataset.theme=saved;
  const btn=document.getElementById('themeBtn');
  if(btn){ btn.textContent=saved==='dark'?'☀️':'🌙'; btn.onclick=()=>{ const next=document.documentElement.dataset.theme==='dark'?'light':'dark'; document.documentElement.dataset.theme=next; localStorage.setItem('dzt_admin_theme',next); btn.textContent=next==='dark'?'☀️':'🌙'; }; }
}
async function loadAdminNotifications(){
  const countEl=document.getElementById('notifCount'), list=document.getElementById('notifList');
  if(!countEl||!list) return;
  try{
    const [{data:orders},{data:products}] = await Promise.all([
      sb.from('orders').select('id,order_number,customer_name,total,status,created_at').order('created_at',{ascending:false}).limit(8),
      sb.from('products').select('id,name,brand,stock,status').lte('stock',5).limit(8)
    ]);
    const pending=(orders||[]).filter(o=>(o.status||'pending')==='pending');
    const low=(products||[]).filter(p=>(p.status||'active')!=='hidden');
    const total=pending.length+low.length;
    countEl.textContent=total>9?'9+':String(total);
    countEl.style.display=total?'inline-flex':'none';
    const rows=[];
    pending.slice(0,4).forEach(o=>rows.push(`<div class='notif-item'><strong>New/pending order</strong><span>${o.order_number||'Order'} · ${o.customer_name||'Customer'} · ${fmtMoney(o.total)}</span></div>`));
    low.slice(0,4).forEach(p=>rows.push(`<div class='notif-item'><strong>Low stock</strong><span>${p.name} · ${p.stock||0} left</span></div>`));
    list.innerHTML=rows.join('')||`<div class='empty compact'>No notifications.</div>`;
  }catch(e){ list.innerHTML=`<div class='empty compact'>Could not load notifications.</div>`; }
}
function bindShell(page){
  setActive(page); initTheme();
  const mob=document.getElementById('mobileMenu'); const side=document.getElementById('sidebar'); const overlay=document.getElementById('sideOverlay');
  if(mob&&side){ mob.onclick=()=>{side.classList.toggle('open'); overlay?.classList.toggle('open');}; overlay&&(overlay.onclick=()=>{side.classList.remove('open'); overlay.classList.remove('open');}); }
  const out=document.getElementById('logoutBtn'); if(out) out.onclick=logout;
  const nb=document.getElementById('notifBtn'), nd=document.getElementById('notifDrop'); if(nb&&nd) nb.onclick=()=>nd.classList.toggle('open');
  requireAdmin().then(ok=>{ if(ok) loadAdminNotifications(); });
  try{ sb.channel('admin-notifs').on('postgres_changes',{event:'*',schema:'public',table:'orders'},loadAdminNotifications).on('postgres_changes',{event:'*',schema:'public',table:'products'},loadAdminNotifications).subscribe(); }catch(e){}
}
function layout(title,page,body){return `<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>${title} | Dzetshal Admin</title><link rel='preconnect' href='https://fonts.googleapis.com'><link href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=DM+Sans:wght@300;400;500;700;800;900&display=swap' rel='stylesheet'><link rel='stylesheet' href='css/admin.css'><script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script><script src='https://cdn.jsdelivr.net/npm/chart.js'></script><script src='js/supabase-client.js'></script><script src='js/common.js'></script></head><body><div class='app'><div class='side-overlay' id='sideOverlay'></div><aside class='sidebar' id='sidebar'><div class='brand'><h2>Dzet<span>shal</span></h2><p>Commerce Admin</p></div><nav class='nav'><div class='nav-group'><span>Overview</span><a href='dashboard.html' data-page='dashboard'><span class='ico'>📊</span>Dashboard</a><a href='analytics.html' data-page='analytics'><span class='ico'>📈</span>Analytics</a></div><div class='nav-group'><span>Commerce</span><a href='orders.html' data-page='orders'><span class='ico'>🛒</span>Orders</a><a href='products.html' data-page='products'><span class='ico'>🌸</span>Products</a><a href='media.html' data-page='media'><span class='ico'>🖼️</span>Media</a><a href='customers.html' data-page='customers'><span class='ico'>👥</span>Customers</a></div><div class='nav-group'><span>Store</span><a href='settings.html' data-page='settings'><span class='ico'>⚙️</span>Settings</a><a href='../index.html'><span class='ico'>↗</span>Storefront</a></div></nav><div class='side-footer'><button class='btn outline full' id='logoutBtn'>Logout</button></div></aside><main class='main'><header class='topbar'><button class='btn outline small mobile-menu' id='mobileMenu'>☰</button><div><h1>${title}</h1><p class='page-sub'>Manage Dzetshal from one professional dashboard.</p></div><div class='top-actions'><button class='icon-btn' id='themeBtn' title='Toggle theme'>🌙</button><div class='notif-wrap'><button class='icon-btn' id='notifBtn' title='Notifications'>🔔<span id='notifCount'></span></button><div class='notif-drop' id='notifDrop'><div class='notif-head'>Notifications</div><div id='notifList'></div></div></div><span class='user-pill' id='userEmail'></span></div></header><section class='content'>${body}</section></main></div><div id='toast' class='toast'></div><script>document.addEventListener('DOMContentLoaded',()=>bindShell('${page}'))</script>`}
