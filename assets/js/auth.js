const WTC_AUTH = (() => {
  function deviceId(){let id=localStorage.getItem(WTC_CONFIG.DEVICE_KEY); if(!id){id='DEV-'+Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem(WTC_CONFIG.DEVICE_KEY,id)} return id}
  function getUser(){try{return JSON.parse(localStorage.getItem(WTC_CONFIG.STORAGE_KEY)||sessionStorage.getItem(WTC_CONFIG.STORAGE_KEY)||'null')}catch{return null}}
  function setUser(user){localStorage.setItem(WTC_CONFIG.STORAGE_KEY,JSON.stringify(user)); sessionStorage.setItem(WTC_CONFIG.STORAGE_KEY,JSON.stringify(user))}
  function clearUser(){localStorage.removeItem(WTC_CONFIG.STORAGE_KEY); sessionStorage.removeItem(WTC_CONFIG.STORAGE_KEY)}
  function redirectByRole(user){const r=String(user.role||'Student').toLowerCase(); location.href = r==='admin'?'admin.html':r==='teacher'?'teacher.html':r==='parent'?'parent.html':'student.html'}
  function requireRole(role){const u=getUser(); if(!u || String(u.role||'').toLowerCase()!==role.toLowerCase()){location.href='index.html';return null} return u}
  function fillHeader(){const u=getUser(); if(!u) return; document.querySelectorAll('[data-user-name]').forEach(e=>e.textContent=u.name||'User'); document.querySelectorAll('[data-user-avatar]').forEach(e=>e.textContent=WTC_UI.initials(u.name));}
  function logout(){clearUser(); location.href='index.html'}
  async function handleLogin(formId='loginForm'){
    const f=document.getElementById(formId); const fd=Object.fromEntries(new FormData(f).entries());
    if(!fd.mobile||!fd.password) return WTC_UI.toast('Enter mobile and password.','error');
    try{const d=await WTC_API.login(fd.mobile.trim(),fd.password.trim(),fd.role||'Student'); if(!d.success) return WTC_UI.toast(d.message||'Login failed.','error'); setUser(d.user); WTC_UI.toast('Login successful.','success'); setTimeout(()=>redirectByRole(d.user),500)}catch(e){WTC_UI.toast(e.message,'error')}
  }
  async function handleSignup(formId='signupForm'){
    const f=document.getElementById(formId); const fd=Object.fromEntries(new FormData(f).entries());
    if(!fd.name||!fd.mobile||!fd.password) return WTC_UI.toast('Fill required fields.','error');
    try{const d=await WTC_API.signupStudent(fd); if(!d.success) return WTC_UI.toast(d.message||'Signup failed.','error'); setUser(d.user); WTC_UI.toast('Account created.','success'); setTimeout(()=>redirectByRole(d.user),500)}catch(e){WTC_UI.toast(e.message,'error')}
  }
  return {deviceId,getUser,setUser,clearUser,redirectByRole,requireRole,fillHeader,logout,handleLogin,handleSignup};
})();
document.addEventListener('DOMContentLoaded',WTC_AUTH.fillHeader);
