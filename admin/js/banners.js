
let BANNERS=[];
function esc(v){return String(v||'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));}
function qs(s){return document.querySelector(s);}
function toLocalValue(value){ if(!value) return ''; const d=new Date(value); if(Number.isNaN(d.getTime())) return ''; const off=d.getTimezoneOffset(); const local=new Date(d.getTime()-off*60000); return local.toISOString().slice(0,16); }
function fromLocalValue(value){ return value ? new Date(value).toISOString() : null; }
document.addEventListener('DOMContentLoaded', async()=>{
  if(!await requireAdmin()) return;
  qs('#bannerSearch').oninput=renderBanners;
  qs('#bannerStatus').onchange=renderBanners;
  qs('#refreshBtn').onclick=loadBanners;
  qs('#addBannerBtn').onclick=()=>openBannerModal();
  qs('#closeBannerModal').onclick=closeBannerModal;
  qs('#cancelBannerBtn').onclick=closeBannerModal;
  qs('#bannerForm').onsubmit=saveBanner;
  qs('#bannerFile').onchange=handleBannerUpload;
  ['bannerImageUrl','bannerTitle','bannerSubtitle','bannerEyebrow'].forEach(id=>qs('#'+id).addEventListener('input',updatePreview));
  await loadBanners();
});
async function loadBanners(){
  try{
    const {data,error}=await sb.from('store_banners').select('*').order('sort_order',{ascending:true}).order('created_at',{ascending:false});
    if(error) throw error;
    BANNERS=data||[];
    renderBanners();
  }catch(err){toast(err.message||'Could not load banners');}
}
function renderBanners(){
  const q=(qs('#bannerSearch').value||'').toLowerCase();
  const status=qs('#bannerStatus').value;
  const now=new Date();
  const rows=BANNERS.filter(b=>{
    const hay=`${b.title||''} ${b.subtitle||''} ${b.eyebrow||''}`.toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(status==='active' && !b.is_active) return false;
    if(status==='inactive' && b.is_active) return false;
    return true;
  });
  qs('#bannerCount').textContent=`${rows.length} banner${rows.length===1?'':'s'}`;
  qs('#bannerGrid').innerHTML=rows.map(b=>{
    const scheduled = (b.starts_at && new Date(b.starts_at)>now) ? 'Scheduled' : (b.ends_at && new Date(b.ends_at)<now) ? 'Expired' : 'Live window';
    return `<article class='banner-card ${b.is_active?'':'inactive'}'>
      <div class='banner-thumb'>${b.image_url?`<img src='${esc(b.image_url)}' loading='lazy'>`:`<span>No image</span>`}</div>
      <div class='banner-body'>
        <div class='banner-meta'><span class='badge ${b.is_active?'green':'gray'}'>${b.is_active?'Active':'Hidden'}</span><span class='muted'>Order ${Number(b.sort_order||0)}</span></div>
        <strong>${esc(b.title||'Untitled banner')}</strong>
        <p>${esc(b.subtitle||'')}</p>
        <small>${esc(b.eyebrow||'Dzetshal')} · ${scheduled}</small>
      </div>
      <div class='banner-actions'>
        <button class='btn outline small' onclick="openBannerModal('${b.id}')">Edit</button>
        <button class='btn outline small' onclick="toggleBanner('${b.id}')">${b.is_active?'Hide':'Show'}</button>
        <button class='btn danger small' onclick="deleteBanner('${b.id}')">Delete</button>
      </div>
    </article>`;
  }).join('') || `<div class='empty'>No banners found. Add one to control the homepage hero.</div>`;
}
function openBannerModal(id){
  const b=id?BANNERS.find(x=>x.id===id):null;
  qs('#bannerModalTitle').textContent=b?'Edit Banner':'Add Banner';
  qs('#bannerId').value=b?.id||'';
  qs('#bannerStoragePath').value=b?.storage_path||'';
  qs('#bannerImageUrl').value=b?.image_url||'';
  qs('#bannerEyebrow').value=b?.eyebrow||'';
  qs('#bannerTitle').value=b?.title||'';
  qs('#bannerSubtitle').value=b?.subtitle||'';
  qs('#bannerButtonText').value=b?.button_text||'Shop Now';
  qs('#bannerButtonLink').value=b?.button_link||'#products';
  qs('#bannerSecondText').value=b?.secondary_button_text||'Our Story';
  qs('#bannerSecondLink').value=b?.secondary_button_link||'#about';
  qs('#bannerSort').value=Number(b?.sort_order||0);
  qs('#bannerActive').value=String(b?.is_active ?? true);
  qs('#bannerOpacity').value=Number(b?.opacity||0.75);
  qs('#bannerStarts').value=toLocalValue(b?.starts_at);
  qs('#bannerEnds').value=toLocalValue(b?.ends_at);
  qs('#bannerFile').value='';
  updatePreview();
  qs('#bannerModal').classList.add('open');
}
function closeBannerModal(){qs('#bannerModal').classList.remove('open');}
function updatePreview(){
  const img=qs('#bannerImageUrl').value;
  const title=qs('#bannerTitle').value||'Discover Your Signature Scent';
  const sub=qs('#bannerSubtitle').value||'Luxury fragrances for every moment.';
  const eyebrow=qs('#bannerEyebrow').value||'Dzetshal';
  qs('#bannerPreview').innerHTML=img?`<img src='${esc(img)}'><div><span>${esc(eyebrow)}</span><strong>${esc(title)}</strong><p>${esc(sub)}</p></div>`:`<span>No image selected</span>`;
}
async function handleBannerUpload(e){
  const file=e.target.files?.[0]; if(!file) return;
  try{
    const progress=qs('#bannerProgress'); progress.style.display='block'; progress.querySelector('span').style.width='35%';
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase();
    const safeTitle=(qs('#bannerTitle').value||'banner').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'banner';
    const path=`homepage/${Date.now()}-${safeTitle}.${ext}`;
    const {error:upErr}=await sb.storage.from('banners').upload(path,file,{upsert:false,cacheControl:'3600'});
    if(upErr) throw upErr;
    progress.querySelector('span').style.width='75%';
    const {data}=sb.storage.from('banners').getPublicUrl(path);
    const oldPath=qs('#bannerStoragePath').value;
    qs('#bannerImageUrl').value=data.publicUrl;
    qs('#bannerStoragePath').value=path;
    if(oldPath && oldPath!==path) await sb.storage.from('banners').remove([oldPath]).catch(()=>{});
    progress.querySelector('span').style.width='100%'; setTimeout(()=>progress.style.display='none',500);
    updatePreview(); toast('Banner image uploaded');
  }catch(err){qs('#bannerProgress').style.display='none'; toast(err.message||'Upload failed');}
}
async function saveBanner(e){
  e.preventDefault();
  const id=qs('#bannerId').value;
  const payload={
    image_url:qs('#bannerImageUrl').value.trim(),
    storage_path:qs('#bannerStoragePath').value.trim()||null,
    eyebrow:qs('#bannerEyebrow').value.trim()||null,
    title:qs('#bannerTitle').value.trim()||'Dzetshal',
    subtitle:qs('#bannerSubtitle').value.trim()||null,
    button_text:qs('#bannerButtonText').value.trim()||'Shop Now',
    button_link:qs('#bannerButtonLink').value.trim()||'#products',
    secondary_button_text:qs('#bannerSecondText').value.trim()||'Our Story',
    secondary_button_link:qs('#bannerSecondLink').value.trim()||'#about',
    sort_order:Number(qs('#bannerSort').value||0),
    is_active:qs('#bannerActive').value==='true',
    opacity:Number(qs('#bannerOpacity').value||0.75),
    starts_at:fromLocalValue(qs('#bannerStarts').value),
    ends_at:fromLocalValue(qs('#bannerEnds').value),
    updated_at:new Date().toISOString()
  };
  try{
    if(!payload.image_url) throw new Error('Please upload or paste a banner image URL.');
    const q=id?sb.from('store_banners').update(payload).eq('id',id):sb.from('store_banners').insert(payload);
    const {error}=await q; if(error) throw error;
    closeBannerModal(); await loadBanners(); toast(id?'Banner updated':'Banner added');
  }catch(err){toast(err.message||'Could not save banner');}
}
async function toggleBanner(id){
  const b=BANNERS.find(x=>x.id===id); if(!b)return;
  try{const {error}=await sb.from('store_banners').update({is_active:!b.is_active,updated_at:new Date().toISOString()}).eq('id',id); if(error)throw error; await loadBanners();}
  catch(err){toast(err.message||'Could not update banner');}
}
async function deleteBanner(id){
  const b=BANNERS.find(x=>x.id===id); if(!b)return;
  if(!confirm('Delete this banner?')) return;
  try{
    const {error}=await sb.from('store_banners').delete().eq('id',id); if(error) throw error;
    if(b.storage_path) await sb.storage.from('banners').remove([b.storage_path]).catch(()=>{});
    await loadBanners(); toast('Banner deleted');
  }catch(err){toast(err.message||'Could not delete banner');}
}
