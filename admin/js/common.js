
function $(sel){return document.querySelector(sel)}
function $all(sel){return [...document.querySelectorAll(sel)]}
function formatRwf(n){return 'RWF ' + Number(n||0).toLocaleString('en-US')}
function fmtDate(v){if(!v)return ''; return new Date(v).toLocaleString()}
function toast(msg){let t=$('#toast'); if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t)} t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
function getItemsText(items){try{ if(typeof items==='string') items=JSON.parse(items); if(!Array.isArray(items)) return JSON.stringify(items,null,2); return items.map(i=>`• ${i.name||i.product_name||'Product'} x${i.qty||i.quantity||1} - ${formatRwf(i.price||0)}`).join('\n') }catch(e){return String(items||'')}}
async function currentUser(){const {data}=await sb.auth.getUser();return data.user}
async function isAdmin(){ const user=await currentUser(); if(!user)return false; const {data,error}=await sb.from('admin_users').select('email,role').eq('email',user.email).maybeSingle(); return !!data && !error }
async function requireAdmin(){ const ok=await isAdmin(); if(!ok){ window.location.href='login.html'; return false } return true }
async function setUserBox(){const user=await currentUser(); const el=$('#userEmail'); if(el&&user)el.textContent=user.email}
async function logout(){await sb.auth.signOut(); window.location.href='login.html'}
function bindShell(){ const menu=$('#mobileMenu'); const side=$('#sidebar'); if(menu&&side)menu.onclick=()=>side.classList.toggle('open'); const lo=$('#logoutBtn'); if(lo)lo.onclick=logout; setUserBox() }
function statusBadge(s){s=(s||'pending').toLowerCase(); return `<span class="badge ${s}">${s}</span>`}
