let PRODUCTS = [];
let PRODUCT_IMAGES = [];
let PRODUCT_IMAGES_BY_PRODUCT = {};
let BRAND_OPTIONS = [];
let TYPE_OPTIONS = [];

const PRODUCT_TYPES_FALLBACK = ['EDP','EDT','Parfum','EDC','Deo','Body'];
const GENDER_OPTIONS = ['women','men','unisex'];

function normText(v){ return String(v == null ? '' : v).trim(); }
function uniqSorted(arr){ return Array.from(new Set(arr.map(normText).filter(Boolean))).sort((a,b)=>a.localeCompare(b)); }
function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));}
function slugify(value){return normText(value).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80) || 'product';}
function placeholder(){return '../img/placeholder.png';}

function cleanType(v){
  const t = normText(v); if(!t) return '';
  const up=t.toUpperCase();
  const map={'EAU DE PARFUM':'EDP','EAU DE TOILETTE':'EDT','EAU DE COLOGNE':'EDC','DEODORANT':'Deo','DEO':'Deo','BODY':'Body','BODY CARE':'Body','PARFUM':'Parfum','PERFUME':'Parfum'};
  return map[up] || t;
}
function cleanGender(v){
  const g=normText(v).toLowerCase();
  if(['woman','women','female','ladies','lady','her'].includes(g)) return 'women';
  if(['man','men','male','gentlemen','him'].includes(g)) return 'men';
  return 'unisex';
}

async function loadAllRows(table, select='*', builder){
  const pageSize = 1000;
  let from=0, all=[];
  while(true){
    let q = sb.from(table).select(select).range(from, from+pageSize-1);
    if(typeof builder === 'function') q = builder(q);
    const {data,error}=await q;
    if(error) throw error;
    const rows = Array.isArray(data) ? data : [];
    all = all.concat(rows);
    if(rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function loadReferenceOptions(){
  const brandsFromProducts = uniqSorted(PRODUCTS.map(p=>p.brand));
  const typesFromProducts = uniqSorted(PRODUCTS.map(p=>cleanType(p.type)));
  let brandsFromTable = [];
  let catsFromTable = [];
  try{ brandsFromTable = uniqSorted((await loadAllRows('brands','name',q=>q.order('name'))).map(b=>b.name)); }catch(e){}
  try{ catsFromTable = uniqSorted((await loadAllRows('categories','name',q=>q.order('name'))).map(c=>cleanType(c.name))); }catch(e){}
  BRAND_OPTIONS = uniqSorted(brandsFromTable.concat(brandsFromProducts));
  TYPE_OPTIONS = uniqSorted(PRODUCT_TYPES_FALLBACK.concat(catsFromTable).concat(typesFromProducts));
  renderProductFormOptions();
}

function renderProductFormOptions(){
  const bd = $('#brandOptions');
  if(bd) bd.innerHTML = BRAND_OPTIONS.map(b=>`<option value="${escapeHtml(b)}"></option>`).join('');
  const typeSel = $('#ptype');
  if(typeSel){
    typeSel.innerHTML = TYPE_OPTIONS.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
  }
}

async function loadProductImages(){
  try{
    PRODUCT_IMAGES = await loadAllRows('product_images','*',q=>q.order('sort_order',{ascending:true}).order('created_at',{ascending:true}));
  }catch(e){
    PRODUCT_IMAGES = [];
  }
  PRODUCT_IMAGES_BY_PRODUCT = PRODUCT_IMAGES.reduce((acc,img)=>{
    if(!img.product_id) return acc;
    (acc[img.product_id] ||= []).push(img);
    return acc;
  },{});
}

function productMainImage(p){
  const imgs = PRODUCT_IMAGES_BY_PRODUCT[p.id] || [];
  const main = imgs.find(x=>x.is_main) || imgs.find(x=>String(x.image_url||'') === String(p.image_url||'')) || imgs[0];
  return main?.image_url || p.image_url || placeholder();
}

async function fetchFreshProduct(productId){
  const { data, error } = await sb.from('products').select('*').eq('id', productId).maybeSingle();
  if(error) throw error;
  return data || null;
}

async function fetchFreshImages(productId){
  const { data, error } = await sb.from('product_images').select('*').eq('product_id', productId).order('sort_order',{ascending:true}).order('created_at',{ascending:true});
  if(error) throw error;
  return Array.isArray(data) ? data : [];
}

function updateLocalProductImage(productId, imageUrl){
  const p = PRODUCTS.find(x=>x.id===productId);
  if(p) p.image_url = imageUrl || '';
  const pimage = document.getElementById('pimage');
  if(pimage && document.getElementById('pid')?.value === productId) pimage.value = imageUrl || '';
}

async function setOnlyMainImage(productId, imageId, imageUrl){
  // Keep gallery and products table synchronized. This is the only place that changes the main image.
  await sb.from('product_images').update({is_main:false}).eq('product_id', productId);
  if(imageId){
    const { error } = await sb.from('product_images').update({is_main:true}).eq('id', imageId);
    if(error) throw error;
  }
  const { error:pErr } = await sb.from('products').update({image_url:imageUrl || ''}).eq('id', productId);
  if(pErr) throw pErr;
  updateLocalProductImage(productId, imageUrl || '');
}

async function ensureProductMediaState(productId, preferredImageUrl){
  if(!productId) return null;
  const product = await fetchFreshProduct(productId);
  if(!product) return null;
  let imgs = await fetchFreshImages(productId);

  // If the product has a legacy/manual Image URL but no matching gallery row, add it to the gallery
  // so the main image becomes visible and manageable in the editor.
  const manualUrl = normText(preferredImageUrl || product.image_url);
  if(manualUrl && !imgs.some(x=>String(x.image_url||'') === String(manualUrl))){
    const { error: insertErr } = await sb.from('product_images').insert({
      product_id: productId,
      image_url: manualUrl,
      storage_path: null,
      sort_order: imgs.length,
      is_main: imgs.length === 0,
      alt_text: `${product.brand || ''} ${product.name || ''}`.trim()
    });
    if(insertErr) throw insertErr;
    imgs = await fetchFreshImages(productId);
  }

  if(!imgs.length){
    updateLocalProductImage(productId, manualUrl || '');
    return manualUrl || null;
  }

  let main = null;
  if(preferredImageUrl){ main = imgs.find(x=>String(x.image_url||'') === String(preferredImageUrl)); }
  if(!main){ main = imgs.find(x=>x.is_main); }
  if(!main && product.image_url){ main = imgs.find(x=>String(x.image_url||'') === String(product.image_url)); }
  if(!main){ main = imgs[0]; }

  await setOnlyMainImage(productId, main.id, main.image_url);
  await loadProductImages();
  return main.image_url;
}

async function syncProductMainImage(productId, preferredImageUrl){
  return ensureProductMediaState(productId, preferredImageUrl);
}

document.addEventListener('DOMContentLoaded', async()=>{
  if(!await requireAdmin()) return;
  await loadProducts();
  $('#productSearch').oninput = renderProducts;
  $('#productStatus').onchange = renderProducts;
  $('#refreshBtn').onclick = loadProducts;
  $('#addProductBtn').onclick = ()=>openProduct();
  $('#productForm').onsubmit = saveProduct;
  initImageDropZone();
});

async function loadProducts(){
  try{
    PRODUCTS = await loadAllRows('products','*',q=>q.order('brand').order('name'));
    await loadProductImages();
    await loadReferenceOptions();
    renderProducts();
  }catch(error){ toast(error.message || 'Could not load products'); }
}

function renderProducts(){
  const q = ($('#productSearch')?.value || '').toLowerCase();
  const st = $('#productStatus')?.value || '';
  const rows = PRODUCTS.filter(p=>{
    const t = `${p.name||''} ${p.brand||''} ${p.type||''} ${p.gender||''} ${p.size||''}`.toLowerCase();
    return (!q || t.includes(q)) && (!st || String(p.status||'active')===st);
  });
  $('#productsTable').innerHTML = rows.map(p=>`
    <tr>
      <td><img src='${escapeHtml(productMainImage(p))}' loading='lazy' onerror="this.style.display='none'"></td>
      <td><b>${escapeHtml(p.brand||'')}</b><br>${escapeHtml(p.name||'')}<br><span class='muted'>${escapeHtml(cleanType(p.type)||'')} • ${escapeHtml(cleanGender(p.gender)||'')} • ${escapeHtml(p.size||'')}</span></td>
      <td><input class='inline-input' type='number' value='${Number(p.price||0)}' onchange="quickUpdate('${p.id}','price',this.value)"></td>
      <td><input class='inline-input' type='number' value='${Number(p.stock||0)}' onchange="quickUpdate('${p.id}','stock',this.value)"></td>
      <td>${statusBadge(p.status||'active')}</td>
      <td class='actions'><button class='btn outline small' onclick="openProduct('${p.id}')">Edit</button><button class='btn small ${p.status==='hidden'?'primary':'danger'}' onclick="toggleStatus('${p.id}')">${p.status==='hidden'?'Show':'Hide'}</button></td>
    </tr>`).join('') || `<tr><td colspan='6'>No products found.</td></tr>`;
}


function statusBadge(status){
  const s = String(status || 'active').toLowerCase();
  if(s === 'hidden') return `<span class='badge gray'>hidden</span>`;
  if(s === 'inactive') return `<span class='badge amber'>inactive</span>`;
  return `<span class='badge green'>active</span>`;
}

function ensureOption(select, value){
  if(!select || !value) return;
  if(!Array.from(select.options).some(o=>o.value===value)){
    select.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
  }
}

function openProduct(id){
  renderProductFormOptions();
  const p = id ? PRODUCTS.find(x=>x.id===id) : null;
  $('#modalTitle').textContent = p ? 'Edit Product' : 'Add Product';
  $('#pid').value = p?.id || '';
  $('#pname').value = p?.name || '';
  $('#pbrand').value = p?.brand || '';
  const typeValue = cleanType(p?.type) || 'EDP';
  ensureOption($('#ptype'), typeValue);
  $('#ptype').value = typeValue;
  $('#pgender').value = cleanGender(p?.gender || 'unisex');
  $('#psize').value = p?.size || '';
  $('#pprice').value = p?.price || 0;
  $('#pstock').value = p?.stock || 0;
  $('#pstatus').value = p?.status || 'active';
  $('#pimage').value = p?.image_url || '';
  $('#pdesc').value = p?.description || '';
  $('#pfile').value = '';
  const gf = $('#galleryFiles'); if(gf) gf.value='';
  $('#productModal').classList.add('open');
  renderImageManager(p?.id || null);
  if(p?.id){
    syncProductMainImage(p.id).then(()=>{
      renderImageManager(p.id);
      renderProducts();
    }).catch(()=>{});
  }
}

function initImageDropZone(){
  const zone = $('#dropZone');
  const input = $('#galleryFiles');
  if(!zone || !input) return;
  zone.addEventListener('click',()=>input.click());
  input.addEventListener('change',()=>uploadSelectedImages(input.files));
  ['dragenter','dragover'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault(); zone.classList.add('dragover');}));
  ['dragleave','drop'].forEach(evt=>zone.addEventListener(evt,e=>{e.preventDefault(); zone.classList.remove('dragover');}));
  zone.addEventListener('drop',e=>uploadSelectedImages(e.dataTransfer.files));
}

function renderImageManager(productId){
  const grid = $('#mediaGrid');
  const zone = $('#dropZone');
  if(!grid) return;
  if(!productId){
    if(zone) zone.style.display = 'none';
    grid.innerHTML = `<div class='muted'>Save the product first, then reopen it to manage multiple images.</div>`;
    return;
  }
  if(zone) zone.style.display = 'block';
  const imgs = PRODUCT_IMAGES_BY_PRODUCT[productId] || [];
  if(!imgs.length){
    grid.innerHTML = `<div class='muted'>No gallery images yet. Upload one or more images above.</div>`;
    return;
  }
  grid.innerHTML = imgs.map(img=>`
    <div class='media-card ${img.is_main?'main':''}'>
      <div class='media-thumb'><img src='${escapeHtml(img.image_url)}' loading='lazy' onerror="this.style.display='none'"></div>
      <div class='media-actions'>
        <button class='btn ${img.is_main?'primary':'outline'} small' type='button' onclick="setMainImage('${img.id}')">${img.is_main?'Main ✓':'Make Main'}</button>
        <button class='btn outline small' type='button' onclick="document.getElementById('replace-${img.id}').click()">Replace</button>
        <button class='btn danger small' type='button' onclick="deleteImage('${img.id}')">Delete</button>
        <input id='replace-${img.id}' type='file' accept='image/*' style='display:none' onchange="replaceImage('${img.id}', this.files[0])">
      </div>
      ${img.is_main?`<span class='badge active'>Main</span>`:''}
    </div>`).join('');
}

function setProgress(pct){
  const wrap = $('#uploadProgress'); const bar = $('#uploadProgress span');
  if(!wrap || !bar) return;
  wrap.style.display = pct>0 && pct<100 ? 'block' : 'none';
  bar.style.width = pct + '%';
}

async function uploadSelectedImages(fileList){
  const productId = $('#pid')?.value;
  if(!productId){ toast('Save the product before uploading images.'); return; }
  const files = Array.from(fileList||[]).filter(f=>/^image\//.test(f.type));
  if(!files.length) return;
  try{
    for(let i=0;i<files.length;i++){
      setProgress(Math.round((i/files.length)*100));
      await uploadProductImage(productId, files[i]);
    }
    setProgress(100); setTimeout(()=>setProgress(0), 400);
    await loadProductImages();
    const product = PRODUCTS.find(p=>p.id===productId);
    renderImageManager(productId);
    if(product) renderProducts();
    toast('Images uploaded');
  }catch(err){ setProgress(0); toast(err.message || 'Image upload failed'); }
}

async function uploadProductImage(productId, file){
  const p = PRODUCTS.find(x=>x.id===productId) || {name:'product',brand:'dzetshal'};
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const folder = `${slugify(p.brand)}-${slugify(p.name)}`;
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${fileName}`;
  const {error:uploadError}=await sb.storage.from('products').upload(path,file,{upsert:false,cacheControl:'3600'});
  if(uploadError) throw uploadError;
  const {data}=sb.storage.from('products').getPublicUrl(path);
  const imageUrl = data.publicUrl;
  const current = PRODUCT_IMAGES_BY_PRODUCT[productId] || [];
  const isMain = current.length === 0;
  const {error:insertError}=await sb.from('product_images').insert({
    product_id: productId,
    image_url: imageUrl,
    storage_path: path,
    sort_order: current.length,
    is_main: isMain,
    alt_text: `${p.brand || ''} ${p.name || ''}`.trim()
  });
  if(insertError) throw insertError;
  if(isMain){
    await sb.from('products').update({image_url:imageUrl}).eq('id',productId);
    const prod = PRODUCTS.find(x=>x.id===productId); if(prod) prod.image_url=imageUrl;
  }
  return imageUrl;
}

async function setMainImage(imageId){
  let img = PRODUCT_IMAGES.find(x=>x.id===imageId);
  try{
    const {data:freshImg,error:freshErr}=await sb.from('product_images').select('*').eq('id', imageId).maybeSingle();
    if(freshErr) throw freshErr;
    if(freshImg) img = freshImg;
    if(!img) return;
    await setOnlyMainImage(img.product_id, img.id, img.image_url);
    await loadProductImages();
    renderImageManager(img.product_id);
    renderProducts();
    toast('Main image updated');
  }catch(err){ toast(err.message || 'Could not set main image'); }
}

async function replaceImage(imageId, file){
  if(!file || !/^image\//.test(file.type)){ toast('Please choose a valid image file.'); return; }
  let img = PRODUCT_IMAGES.find(x=>x.id===imageId);
  try{
    const {data:freshImg,error:freshErr}=await sb.from('product_images').select('*').eq('id', imageId).maybeSingle();
    if(freshErr) throw freshErr;
    if(freshImg) img = freshImg;
  }catch(err){ toast(err.message || 'Could not load image'); return; }
  if(!img) return;

  try{
    const p = PRODUCTS.find(x=>x.id===img.product_id) || await fetchFreshProduct(img.product_id) || {name:'product',brand:'dzetshal',image_url:''};
    const wasMain = !!img.is_main || (!!p.image_url && String(p.image_url) === String(img.image_url));
    const oldStoragePath = img.storage_path || '';

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const folder = `${slugify(p.brand)}-${slugify(p.name)}`;
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const path = `${folder}/${fileName}`;

    const {error:uploadError}=await sb.storage.from('products').upload(path,file,{upsert:false,cacheControl:'3600'});
    if(uploadError) throw uploadError;

    const {data}=sb.storage.from('products').getPublicUrl(path);
    const imageUrl = data.publicUrl;

    // Replace the SAME row. This preserves position, ID and whether it was main.
    const {error:updateError}=await sb.from('product_images').update({
      image_url:imageUrl,
      storage_path:path,
      alt_text:`${p.brand || ''} ${p.name || ''}`.trim(),
      is_main: wasMain
    }).eq('id', imageId);
    if(updateError) throw updateError;

    if(wasMain){
      await setOnlyMainImage(img.product_id, imageId, imageUrl);
    }

    if(oldStoragePath){ await sb.storage.from('products').remove([oldStoragePath]).catch(()=>{}); }

    await loadProductImages();
    renderImageManager(img.product_id);
    renderProducts();
    toast(wasMain ? 'Main image replaced' : 'Image replaced');
  }catch(err){ toast(err.message || 'Could not replace image'); }
}

async function deleteImage(imageId){
  let img = PRODUCT_IMAGES.find(x=>x.id===imageId);
  if(!img) return;
  if(!confirm('Delete this image from the product gallery?')) return;
  try{
    const {data:freshImg}=await sb.from('product_images').select('*').eq('id', imageId).maybeSingle();
    if(freshImg) img = freshImg;
    const productId = img.product_id;
    const prod = PRODUCTS.find(p=>p.id===productId) || await fetchFreshProduct(productId) || {};
    const wasMain = !!img.is_main || String(prod.image_url || '') === String(img.image_url || '');
    const oldStoragePath = img.storage_path || '';

    const {error}=await sb.from('product_images').delete().eq('id',imageId);
    if(error) throw error;
    if(oldStoragePath){ await sb.storage.from('products').remove([oldStoragePath]).catch(()=>{}); }

    let remaining = await fetchFreshImages(productId);
    if(remaining.length){
      if(wasMain || !remaining.find(x=>x.is_main)){
        const next = remaining.find(x=>!x.is_main) || remaining[0];
        await setOnlyMainImage(productId, next.id, next.image_url);
      }else{
        const main = remaining.find(x=>x.is_main) || remaining[0];
        await setOnlyMainImage(productId, main.id, main.image_url);
      }
    }else{
      await setOnlyMainImage(productId, null, '');
    }
    await loadProductImages();
    renderImageManager(productId);
    renderProducts();
    toast('Image deleted');
  }catch(err){ toast(err.message || 'Could not delete image'); }
}

async function uploadImage(file){
  // Backward-compatible single image upload for the legacy file field.
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeName = file.name.replace(/[^a-z0-9.\-_]/gi,'-').toLowerCase();
  const path = `uncategorized/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}.${ext}`.replace(/\.(jpg|jpeg|png|webp|avif|gif)\.(jpg|jpeg|png|webp|avif|gif)$/i,'.$1');
  const {error}=await sb.storage.from('products').upload(path,file,{upsert:false,cacheControl:'3600'});
  if(error) throw error;
  const {data}=sb.storage.from('products').getPublicUrl(path);
  return data.publicUrl;
}

async function saveProduct(e){
  e.preventDefault();
  const btn=e.target.querySelector('button[type=submit]');
  btn.disabled=true; btn.textContent='Saving...';
  try{
    let image_url = $('#pimage').value.trim();
    const id = $('#pid').value;
    if(id){
      const imgs = PRODUCT_IMAGES_BY_PRODUCT[id] || [];
      const mainImg = imgs.find(x=>x.is_main) || imgs.find(x=>x.image_url === image_url) || imgs[0];
      if(mainImg) image_url = mainImg.image_url;
    }
    const payload = {
      name: $('#pname').value.trim(),
      brand: $('#pbrand').value.trim(),
      type: cleanType($('#ptype').value),
      gender: cleanGender($('#pgender').value),
      size: $('#psize').value.trim(),
      price: Number($('#pprice').value || 0),
      stock: Number($('#pstock').value || 0),
      status: $('#pstatus').value,
      image_url,
      description: $('#pdesc').value.trim()
    };
    if(!payload.name) throw new Error('Product name is required.');
    if(!payload.brand) throw new Error('Brand is required.');
    let productId = id;
    if(id){
      const {error}=await sb.from('products').update(payload).eq('id',id);
      if(error) throw error;
    }else{
      const {data,error}=await sb.from('products').insert(payload).select('*').single();
      if(error) throw error;
      productId = data.id;
      $('#pid').value = productId;
    }
    await loadProducts();
    const fileInput = $('#pfile');
    if(fileInput && fileInput.files && fileInput.files.length){
      await uploadSelectedImages(fileInput.files);
    }
    await loadProductImages();
    await syncProductMainImage(productId, image_url);
    toast('Product saved');
    $('#productModal').classList.remove('open');
    await loadProducts();
  }catch(err){ toast(err.message || 'Save failed'); }
  btn.disabled=false; btn.textContent='Save Product';
}

async function quickUpdate(id,field,value){
  const product = PRODUCTS.find(x=>x.id===id);
  const beforeStock = Number(product?.stock || 0);
  const payload = {[field]: field==='price'||field==='stock' ? Number(value) : value};
  const {error}=await sb.from('products').update(payload).eq('id',id);
  if(error){toast(error.message);return;}
  if(product) product[field]=payload[field];
  if(field === 'stock' && beforeStock !== payload.stock){
    try{
      const session = await getSession();
      await sb.from('inventory_history').insert({
        product_id:id,
        product_name:product?.name || '',
        brand:product?.brand || '',
        change_amount: payload.stock - beforeStock,
        quantity_before: beforeStock,
        quantity_after: payload.stock,
        reason:'admin_adjustment',
        note:'Stock updated from Products page',
        changed_by:session?.user?.email || 'admin'
      });
    }catch(e){}
  }
  toast('Updated');
}

async function toggleStatus(id){
  const p=PRODUCTS.find(x=>x.id===id);
  const status=p?.status==='hidden'?'active':'hidden';
  await quickUpdate(id,'status',status);
  renderProducts();
}
