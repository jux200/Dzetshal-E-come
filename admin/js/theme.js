
document.addEventListener('DOMContentLoaded',async()=>{
  if(!await requireAdmin())return;
  await loadTheme();
  saveThemeBtn.onclick=saveTheme;
  ['primaryColor','accentColor','primaryText','accentText','logoTheme','logoSize','showStoreName','showTagline'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.oninput=syncPreview;
  });
});
async function loadTheme(){
  const {data,error}=await sb.from('theme_settings').select('*').eq('id','main').maybeSingle();
  const t=(!error&&data)||{};
  primaryColor.value=t.primary_color||'#224C44'; accentColor.value=t.accent_color||'#F8B38F';
  primaryText.value=primaryColor.value; accentText.value=accentColor.value;
  headerStyle.value=t.header_style||'classic'; buttonStyle.value=t.button_style||'rounded';
  fontHeading.value=t.font_heading||'HolidayFree'; fontSubtitle.value=t.font_subtitle||'Montserrat';
  logoTheme.value=t.logo_theme||'green'; logoSize.value=Number(t.logo_size||180);
  showStoreName.checked=t.show_store_name!==false; showTagline.checked=t.show_tagline!==false;
  syncPreview();
}
function syncPreview(){
  if(document.activeElement===primaryText) primaryColor.value=primaryText.value; else primaryText.value=primaryColor.value;
  if(document.activeElement===accentText) accentColor.value=accentText.value; else accentText.value=accentColor.value;
  themePreview.style.background=`linear-gradient(135deg,${primaryColor.value},#162e29)`;
  themePreview.querySelector('span').style.color=accentColor.value;
  const path=logoTheme.value==='peach'?'../img/brand-logo-peach.png':'../img/brand-logo-green.png';
  brandPreviewImage.src=path; brandPreviewImage.style.width=`${logoSize.value}px`;
  brandPreviewImage.style.display=showStoreName.checked?'block':'none';
  brandThemePreview.querySelector('.preview-emblem').style.display=showTagline.checked?'grid':'none';
  logoSizeValue.textContent=`${logoSize.value}px`;
}
async function saveTheme(){
  const payload={id:'main',primary_color:primaryColor.value,accent_color:accentColor.value,header_style:headerStyle.value,button_style:buttonStyle.value,font_heading:fontHeading.value,font_subtitle:fontSubtitle.value,logo_theme:logoTheme.value,logo_size:Number(logoSize.value),show_store_name:showStoreName.checked,show_tagline:showTagline.checked,updated_at:new Date().toISOString()};
  const {error}=await sb.from('theme_settings').upsert(payload,{onConflict:'id'});
  if(error){toast(error.message);return}
  await logActivity('Updated theme settings','theme_settings','main',payload); toast('Theme saved');
}
