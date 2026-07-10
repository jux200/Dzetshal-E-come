
let aiProducts=[]; let selectedTone='Elegant and luxurious'; let lastOutput=''; let selectedProduct=null;
const fallbackImg='../index.html';
function clean(v){return (v||'').toString().trim();}
function optionLabel(p){return `${p.brand||'Dzetshal'} — ${p.name||'Product'}${p.size?' · '+p.size:''}`;}
async function loadAIProducts(){
  const sel=document.getElementById('aiProduct');
  sel.innerHTML='<option>Loading products...</option>';
  const {data,error}=await sb.from('products').select('id,name,brand,type,gender,size,price,description,top_notes,middle_notes,base_notes,image_url,status').order('brand',{ascending:true}).order('name',{ascending:true}).limit(1000);
  if(error){ sel.innerHTML='<option>Could not load products</option>'; toast(error.message); return; }
  aiProducts=data||[];
  sel.innerHTML=aiProducts.map(p=>`<option value="${p.id}">${optionLabel(p)}</option>`).join('') || '<option>No products found</option>';
  selectedProduct=aiProducts[0]||null; updatePreview();
}
function updatePreview(){
  const id=document.getElementById('aiProduct').value; selectedProduct=aiProducts.find(p=>p.id===id)||aiProducts[0]||null;
  const box=document.getElementById('aiProductPreview');
  if(!selectedProduct){box.style.display='none';return;}
  box.style.display='flex';
  box.innerHTML=`<img src="${selectedProduct.image_url||''}" onerror="this.style.display='none'"><div><strong>${clean(selectedProduct.name)}</strong><div class='muted'>${clean(selectedProduct.brand)} · ${clean(selectedProduct.type)} · ${clean(selectedProduct.size)}</div><div class='muted'>${fmtMoney(selectedProduct.price)}</div></div>`;
}
function noteList(v){return clean(v) || 'bergamot, pink pepper, floral accords, warm woods';}
function makeContent(){
  const p=selectedProduct||{}; const name=clean(p.name)||'This fragrance'; const brand=clean(p.brand)||'Dzetshal'; const type=clean(p.type)||'fragrance'; const size=clean(p.size)||''; const gender=clean(p.gender)||'unisex'; const extra=clean(document.getElementById('extraPrompt').value); const tone=selectedTone;
  const top=noteList(p.top_notes), mid=noteList(p.middle_notes), base=noteList(p.base_notes);
  const contentType=document.getElementById('contentType').value;
  const baseDesc=`${name} by ${brand} is a ${tone.toLowerCase()} ${type}${size?' in '+size:''} crafted for ${gender} fragrance lovers. It opens with luminous top notes of ${top}, develops into a refined heart of ${mid}, and settles into a memorable base of ${base}. The result is a polished scent experience that feels authentic, distinctive, and perfectly suited to Dzetshal’s luxury fragrance collection.`;
  const extras=extra?`\n\nAdditional direction: ${extra}`:'';
  if(contentType==='short') return `${name} by ${brand} is a ${tone.toLowerCase()} ${type} with refined notes of ${top}, ${mid}, and ${base}. A beautiful choice for customers looking for a distinctive luxury fragrance.${extras}`;
  if(contentType==='seo-title') return `${name} ${size} | Authentic ${brand} Perfume in Rwanda | Dzetshal`;
  if(contentType==='meta') return `Shop authentic ${name}${size?' '+size:''} by ${brand} at Dzetshal. Luxury fragrances available in Rwanda with trusted service and premium selections.`;
  if(contentType==='notes') return `Top Notes: ${top}\nMiddle Notes: ${mid}\nBase Notes: ${base}\n\nSuggested Accord Direction: floral, woody, musky, warm spicy, amber`;
  if(contentType==='marketing') return `Discover ${name}, a ${tone.toLowerCase()} fragrance from ${brand}. Perfect for gifting or elevating your personal scent collection, this perfume brings elegance, confidence, and lasting beauty to every moment.${extras}`;
  if(contentType==='translate-fr') return `Version française suggérée:\n\n${name} de ${brand} est une fragrance ${tone.toLowerCase()} qui associe des notes de tête de ${top}, un cœur raffiné de ${mid}, et un fond chaleureux de ${base}. Une belle option pour les clients qui recherchent un parfum luxueux, authentique et mémorable chez Dzetshal.${extras}`;
  if(contentType==='translate-en') return `Suggested English version:\n\n${baseDesc}${extras}`;
  return `${baseDesc}${extras}`;
}
async function generate(){ lastOutput=makeContent(); document.getElementById('aiOutput').textContent=lastOutput; saveHistory(); }
function saveHistory(){ const key='dzt_ai_history'; const rows=JSON.parse(localStorage.getItem(key)||'[]'); rows.unshift({date:new Date().toLocaleString(),product:selectedProduct?.name||'Product',type:document.getElementById('contentType').value,content:lastOutput}); localStorage.setItem(key,JSON.stringify(rows.slice(0,20))); renderHistory(); }
function renderHistory(){ const rows=JSON.parse(localStorage.getItem('dzt_ai_history')||'[]'); const h=document.getElementById('aiHistory'); h.innerHTML=rows.map(r=>`<div class='ai-history-item'><strong>${r.product} · ${r.type}</strong><span>${r.date}</span><p>${r.content.slice(0,180)}${r.content.length>180?'...':''}</p></div>`).join('')||`<div class='empty compact'>No generated content yet.</div>`; }
async function insertIntoProduct(){ if(!selectedProduct||!lastOutput) return toast('Generate content first.'); const {error}=await sb.from('products').update({description:lastOutput}).eq('id',selectedProduct.id); if(error) return toast(error.message); toast('Inserted into product description.'); selectedProduct.description=lastOutput; }
document.addEventListener('DOMContentLoaded',()=>{
  loadAIProducts(); renderHistory();
  document.getElementById('aiProduct').onchange=updatePreview;
  document.getElementById('generateBtn').onclick=generate; document.getElementById('regenBtn').onclick=generate;
  document.getElementById('clearBtn').onclick=()=>{document.getElementById('aiOutput').textContent='Choose a product, select a content type, then click Generate.'; lastOutput='';};
  document.getElementById('copyBtn').onclick=async()=>{ if(!lastOutput) return toast('Nothing to copy.'); await navigator.clipboard.writeText(lastOutput); toast('Copied.'); };
  document.getElementById('insertBtn').onclick=insertIntoProduct;
  document.querySelectorAll('.tone-pill').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tone-pill').forEach(x=>x.classList.remove('active')); b.classList.add('active'); selectedTone=b.dataset.tone;});
  document.querySelectorAll('.ai-tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.ai-tab').forEach(x=>x.classList.remove('active')); b.classList.add('active'); const target=b.dataset.target; document.getElementById('aiOutput').style.display=target==='output'?'block':'none'; document.getElementById('aiHistory').style.display=target==='history'?'grid':'none';});
});
