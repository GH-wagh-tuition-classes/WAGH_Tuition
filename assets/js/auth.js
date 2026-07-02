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
    try {
      return JSON.parse(localStorage.getItem(WTC_CONFIG.STORAGE_KEY) || sessionStorage.getItem(WTC_CONFIG.STORAGE_KEY) || 'null');
    } catch { return null; }
  }
  function setUser(user) {
    localStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(user));
    sessionStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(user));
  }
  function clearUser() {
    localStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
    sessionStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
  }
  function redirectByRole(user) {
    const role = String(user.role || 'Student').toLowerCase();
    if (role === 'teacher') window.location.href = 'teacher.html';
    else if (role === 'admin') window.location.href = 'admin.html';
    else if (role === 'parent') window.location.href = 'parent.html';
    else window.location.href = 'student.html';
  }
  function requireRole(role) {
    const user = getUser();
    if (!user || String(user.role || '').toLowerCase() !== role.toLowerCase()) {
      window.location.href = 'index.html#login';
      return null;
    }
    return user;
  }
  async function handleLogin(formId = 'loginForm') {
    const form = document.getElementById(formId);
    const fd = Object.fromEntries(new FormData(form).entries());
    const mobile = String(fd.mobile || '').trim();
    const password = String(fd.password || '').trim();
    const role = fd.role || 'Student';
    if (!mobile || !password) return WTC_UI.toast('Please enter mobile and password.', 'error');
    try {
      const data = await WTC_API.login(mobile, password, role);
      if (!data.success) return WTC_UI.toast(data.message || 'Login failed.', 'error');
      setUser(data.user);
      WTC_UI.toast('Login successful.', 'success');
      setTimeout(() => redirectByRole(data.user), 500);
    } catch (err) { WTC_UI.toast(err.message, 'error'); }
  }
  async function handleSignup(formId = 'signupForm') {
    const form = document.getElementById(formId);
    const fd = Object.fromEntries(new FormData(form).entries());
    if (!fd.name || !fd.mobile || !fd.password) return WTC_UI.toast('Please fill required fields.', 'error');
    try {
      const data = await WTC_API.signupStudent(fd);
      if (!data.success) return WTC_UI.toast(data.message || 'Signup failed.', 'error');
      setUser(data.user);
      WTC_UI.toast('Account created successfully.', 'success');
      setTimeout(() => redirectByRole(data.user), 500);
    } catch (err) { WTC_UI.toast(err.message, 'error'); }
  }
  function logout() {
    clearUser();
    window.location.href = 'index.html';
  }
  return { deviceId, getUser, setUser, clearUser, redirectByRole, requireRole, handleLogin, handleSignup, logout };
})();
