const WTC_AUTH = (() => {
  function deviceId() {
    let id = localStorage.getItem(WTC_CONFIG.DEVICE_KEY);
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem(WTC_CONFIG.DEVICE_KEY, id);
    }
    return id;
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(WTC_CONFIG.STORAGE_KEY) || 'null'); } catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(user));
    sessionStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(user));
  }
  function clearUser() {
    localStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
    sessionStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
  }
  function requireRole(role) {
    const user = getUser();
    if (!user || !user.role || String(user.role).toLowerCase() !== role.toLowerCase()) {
      window.location.href = 'index.html';
      return null;
    }
    return user;
  }
  function redirectByRole(user) {
    const role = String(user.role || 'Student').toLowerCase();
    if (role === 'teacher') window.location.href = 'teacher.html';
    else if (role === 'admin') window.location.href = 'admin.html';
    else if (role === 'parent') window.location.href = 'parent.html';
    else window.location.href = 'student.html';
  }
  function logout() {
    clearUser();
    window.location.href = 'index.html';
  }
  async function handleLogin(formId = 'loginForm') {
    const form = document.getElementById(formId);
    const mobile = form?.querySelector('[name="mobile"]')?.value.trim();
    const password = form?.querySelector('[name="password"]')?.value.trim();
    if (!mobile || !password) return WTC_UI.toast('Please enter mobile and password.', 'error');
    try {
      const data = await WTC_API.login(mobile, password);
      if (!data.success) return WTC_UI.toast(data.message || 'Login failed.', 'error');
      setUser(data.user);
      WTC_UI.toast('Login successful.', 'success');
      setTimeout(() => redirectByRole(data.user), 500);
    } catch (e) { WTC_UI.toast(e.message, 'error'); }
  }
  async function handleSignup(formId = 'signupForm') {
    const form = document.getElementById(formId);
    const payload = Object.fromEntries(new FormData(form).entries());
    if (!payload.name || !payload.mobile || !payload.password) return WTC_UI.toast('Please fill required fields.', 'error');
    try {
      const data = await WTC_API.signupStudent(payload);
      if (!data.success) return WTC_UI.toast(data.message || 'Signup failed.', 'error');
      setUser(data.user);
      WTC_UI.toast('Signup successful.', 'success');
      setTimeout(() => redirectByRole(data.user), 500);
    } catch (e) { WTC_UI.toast(e.message, 'error'); }
  }
  return { deviceId, getUser, setUser, clearUser, requireRole, redirectByRole, logout, handleLogin, handleSignup };
})();
