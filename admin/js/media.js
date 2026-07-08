
let MEDIA_IMAGES = [];
let MEDIA_PRODUCTS = [];
let PRODUCT_BY_ID = {};
function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));}
function $(s){ return document.querySelector(s); }
async function loadAllRows(table, select='*', builder){
  const pageSize=1000; let from=0, all=[];
  while(true){
    let q=sb.from(table).select(select).range(from, from+pageSize-1);
    if(typeof builder==='function') q=builder(q);
    const {data,error}=await q; if(error) throw error;
    const rows=Array.isArray(data)?data:[]; all=all.concat(rows);
    if(rows.length<pageSize) break; from+=pageSize;
  }
  return all;
}
document.addEventListener('DOMContentLoaded', async()=>{
  if(!await requireAdmin()) return;
  $('#mediaSearch').oninput=renderMedia;
  $('#mediaFilter').onchange=renderMedia;
  $('#refreshBtn').onclick=loadMedia;
  await loadMedia();
});
async function loadMedia(){
  try{
    MEDIA_PRODUCTS = await loadAllRows('products','id,name,brand,image_url,status',q=>q.order('brand').order('name'));
    PRODUCT_BY_ID = Object.fromEntries(MEDIA_PRODUCTS.map(p=>[p.id,p]));
    MEDIA_IMAGES = await loadAllRows('product_images','*',q=>q.order('created_at',{ascending:false}));
    renderMedia();
  }catch(err){ toast(err.message || 'Could not load media'); }
}
function renderMedia(){
  const q=($('#mediaSearch')?.value||'').toLowerCase();
  const f=$('#mediaFilter')?.value||'';
  const rows=MEDIA_IMAGES.filter(img=>{
    const p=PRODUCT_BY_ID[img.product_id]||{};
    const hay=`${p.brand||''} ${p.name||''} ${img.alt_text||''} ${img.image_url||''}`.toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(f==='main' && !img.is_main) return false;
    if(f==='gallery' && img.is_main) return false;
    return true;
  });
  $('#mediaCount').textContent = `${rows.length} image${rows.length===1?'':'s'}`;
  $('#mediaLibrary').innerHTML = rows.map(img=>{
    const p=PRODUCT_BY_ID[img.product_id]||{};
    return `<article class='media-lib-card'>
      <div class='media-lib-img'><img src='${escapeHtml(img.image_url)}' loading='lazy' onerror="this.parentElement.classList.add('broken')"></div>
      <div class='media-lib-body'>
        <strong>${escapeHtml(p.brand||'Unknown brand')}</strong>
        <span>${escapeHtml(p.name||'Unlinked product')}</span>
        <small>${img.is_main?'Main image':'Gallery image'}</small>
      </div>
      <div class='media-lib-actions'>
        <button class='btn outline small' onclick="copyUrl('${escapeHtml(img.image_url)}')">Copy URL</button>
        <button class='btn outline small' onclick="location.href='products.html'">Edit Product</button>
        <button class='btn danger small' onclick="deleteMedia('${img.id}')">Delete</button>
      </div>
    </article>`;
  }).join('') || `<div class='empty'>No media found. Upload images from Products → Edit Product.</div>`;
}
async function copyUrl(url){
  try{ await navigator.clipboard.writeText(url); toast('Image URL copied'); }
  catch(e){ prompt('Copy image URL:', url); }
}
async function deleteMedia(id){
  const img=MEDIA_IMAGES.find(x=>x.id===id); if(!img) return;
  if(!confirm('Delete this image? This removes it from the product gallery.')) return;
  try{
    const {error}=await sb.from('product_images').delete().eq('id',id); if(error) throw error;
    if(img.storage_path) await sb.storage.from('products').remove([img.storage_path]).catch(()=>{});
    if(img.is_main){
      const next=MEDIA_IMAGES.find(x=>x.product_id===img.product_id && x.id!==id);
      await sb.from('products').update({image_url:next?.image_url||''}).eq('id',img.product_id);
      if(next) await sb.from('product_images').update({is_main:true}).eq('id',next.id);
    }
    await loadMedia(); toast('Image deleted');
  }catch(err){ toast(err.message || 'Could not delete image'); }
}
