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
  const el=document.getElementById('userEmail'); if(el) el.textContent=email; const sideEmail=document.getElementById('sideUserEmail'); if(sideEmail) sideEmail.textContent=email;
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
function layout(title,page,body){
  return `<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>${title} | Dzetshal Admin</title><link rel='preconnect' href='https://fonts.googleapis.com'><link href='https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;1,400&family=DM+Sans:wght@300;400;500;700;800;900&family=Montserrat:wght@700;800;900&display=swap' rel='stylesheet'><link rel='stylesheet' href='css/admin.css'><script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script><script src='https://cdn.jsdelivr.net/npm/chart.js'></script><script src='js/supabase-client.js'></script><script src='js/common.js'></script></head><body><div class='app'><div class='side-overlay' id='sideOverlay'></div><aside class='sidebar sidebar-v2' id='sidebar'><div class='brand brand-v2'><div class='brand-emblem'><span>D</span></div><div class='brand-copy'><h2>Dzetshal</h2><p>JARDIN DE BEAUTÉ</p></div></div><nav class='nav nav-v2'><div class='nav-scroll'><div class='nav-group'><span>Overview</span><a href='dashboard.html' data-page='dashboard'><span class='ico'>📊</span><span>Dashboard</span></a><a href='analytics.html' data-page='analytics'><span class='ico'>📈</span><span>Analytics</span></a><a href='reports.html' data-page='reports'><span class='ico'>📄</span><span>Reports</span></a><a href='ai-insights.html' data-page='ai-insights'><span class='ico'>🧠</span><span>AI Insights</span></a></div><div class='nav-sep'></div><div class='nav-group'><span>Commerce</span><a href='orders.html' data-page='orders'><span class='ico'>🛒</span><span>Orders</span></a><a href='products.html' data-page='products'><span class='ico'>🌸</span><span>Products</span></a><a href='inventory.html' data-page='inventory'><span class='ico'>📦</span><span>Inventory</span></a><a href='dispatch.html' data-page='dispatch'><span class='ico'>🚚</span><span>Dispatch</span></a><a href='media.html' data-page='media'><span class='ico'>🖼️</span><span>Media</span></a><a href='customers.html' data-page='customers'><span class='ico'>👥</span><span>Customers</span></a></div><div class='nav-sep'></div><div class='nav-group'><span>Marketing</span><a href='marketing.html' data-page='marketing'><span class='ico'>📢</span><span>Marketing Hub</span></a><a href='banners.html' data-page='banners'><span class='ico'>🖼️</span><span>Banners</span></a><a href='homepage.html' data-page='homepage'><span class='ico'>🏠</span><span>Homepage</span></a><a href='theme.html' data-page='theme'><span class='ico'>🎨</span><span>Theme</span></a><a href='ai-assistant.html' data-page='ai-assistant'><span class='ico'>✨</span><span>AI Assistant</span></a><a href='coupons.html' data-page='coupons'><span class='ico'>🏷️</span><span>Coupons</span></a><a href='flash-sales.html' data-page='flash-sales'><span class='ico'>⚡</span><span>Flash Sales</span></a><a href='featured.html' data-page='featured'><span class='ico'>⭐</span><span>Featured</span></a><a href='reviews.html' data-page='reviews'><span class='ico'>💬</span><span>Reviews</span></a><a href='newsletter.html' data-page='newsletter'><span class='ico'>📧</span><span>Newsletter</span></a><a href='loyalty.html' data-page='loyalty'><span class='ico'>🎁</span><span>Loyalty</span></a><a href='giftcards.html' data-page='giftcards'><span class='ico'>🎟️</span><span>Gift Cards</span></a></div><div class='nav-sep'></div><div class='nav-group'><span>Store</span><a href='settings.html' data-page='settings'><span class='ico'>⚙️</span><span>Settings</span></a><a href='activity.html' data-page='activity'><span class='ico'>🧾</span><span>Activity Logs</span></a><a href='system.html' data-page='system'><span class='ico'>🛠️</span><span>System Monitor</span></a><a href='backups.html' data-page='backups'><span class='ico'>💾</span><span>Backups</span></a><a href='../index.html'><span class='ico'>↗</span><span>Storefront</span></a></div></div></nav><div class='side-footer side-footer-v2'><div class='side-user'><div class='side-user-avatar'>D</div><div><strong>Dzetshal Admin</strong><small id='sideUserEmail'>Signed in</small></div></div><button class='btn outline full logout-v2' id='logoutBtn'>Logout</button></div></aside><main class='main'><header class='topbar'><button class='btn outline small mobile-menu' id='mobileMenu'>☰</button><div><h1>${title}</h1><p class='page-sub'>Manage Dzetshal from one professional dashboard.</p></div><div class='top-actions'><button class='icon-btn' id='themeBtn' title='Toggle theme'>🌙</button><div class='notif-wrap'><button class='icon-btn' id='notifBtn' title='Notifications'>🔔<span id='notifCount'></span></button><div class='notif-drop' id='notifDrop'><div class='notif-head'>Notifications</div><div id='notifList'></div></div></div><span class='user-pill' id='userEmail'></span></div></header><section class='content'>${body}</section></main></div><div id='toast' class='toast'></div><script>document.addEventListener('DOMContentLoaded',()=>bindShell('${page}'))</script>`;
}

async function logActivity(action, entityType='', entityId='', details={}){ try{ await sb.rpc('log_admin_activity',{p_action:action,p_entity_type:entityType,p_entity_id:String(entityId||''),p_details:details}); }catch(e){ try{ await sb.from('activity_logs').insert({admin_email:(await getSession())?.user?.email,action,entity_type:entityType,entity_id:String(entityId||''),details}); }catch(_){} } }
async function logError(source,message,details={}){ try{ await sb.from('system_errors').insert({source,message,details}); }catch(e){ console.warn('Could not log error',e); } }
