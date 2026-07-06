
document.getElementById('loginForm').addEventListener('submit', async (e)=>{
 e.preventDefault(); const btn=e.target.querySelector('button'); const err=document.getElementById('err'); err.style.display='none'; btn.disabled=true; btn.textContent='Checking...';
 const email=document.getElementById('email').value.trim(); const password=document.getElementById('password').value;
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){err.textContent=error.message;err.style.display='block';btn.disabled=false;btn.textContent='Login';return}
 const {data:adm,error:admErr}=await sb.from('admin_users').select('email').eq('email',email).maybeSingle();
 if(admErr||!adm){await sb.auth.signOut(); err.textContent='This email is not registered as an admin.'; err.style.display='block'; btn.disabled=false; btn.textContent='Login';return}
 window.location.href='dashboard.html';
});
