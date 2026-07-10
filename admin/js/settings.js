
document.addEventListener('DOMContentLoaded', async()=>{ if(!await requireAdmin()) return; await loadSettings(); document.getElementById('saveSettings').onclick=saveSettings; });
async function loadSettings(){
  const {data,error}=await sb.from('store_settings').select('*').eq('id','main').maybeSingle();
  if(error){ toast(error.message); return; }
  const s=data||{};
  storeName.value=s.store_name||'Dzetshal'; tagline.value=s.tagline||'Jardin de Beauté'; currency.value=s.currency||'RWF'; storeEmail.value=s.email||'dzetshalweb@gmail.com'; storeWhatsApp.value=s.whatsapp||'+250 795 308 453'; storePhone.value=s.phone||''; momoNumber.value=s.momo_number||''; momoName.value=s.momo_name||''; pickupAddress.value=s.pickup_address||''; announcement.value=s.announcement||''; facebookUrl.value=s.facebook_url||''; instagramUrl.value=s.instagram_url||''; tiktokUrl.value=s.tiktok_url||'';
}
async function saveSettings(){
  const payload={id:'main',store_name:storeName.value,tagline:tagline.value,currency:currency.value,email:storeEmail.value,whatsapp:storeWhatsApp.value,phone:storePhone.value,momo_number:momoNumber.value,momo_name:momoName.value,pickup_address:pickupAddress.value,announcement:announcement.value,facebook_url:facebookUrl.value,instagram_url:instagramUrl.value,tiktok_url:tiktokUrl.value,updated_at:new Date().toISOString()};
  const {error}=await sb.from('store_settings').upsert(payload);
  if(error){ toast(error.message); await logError('settings',error.message,{payload}); return; }
  await logActivity('Updated store settings','store_settings','main',payload); toast('Settings saved.');
}
