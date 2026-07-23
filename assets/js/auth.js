/* WAGH Tuition Classes — Authentication helpers H1.0 (backward compatible) */
const WTC_AUTH = (() => {
  function deviceId() {
    let id = localStorage.getItem(WTC_CONFIG.DEVICE_KEY);
    if (!id) {
      id = 'DEV-' + Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem(WTC_CONFIG.DEVICE_KEY, id);
    }
    return id;
  }

  function normalizeMobile(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  }

  function normalizeUser(raw={}) {
    const role = raw.role || raw.userRole || 'Student';
    const id = raw.studentId || raw.teacherId || raw.adminId || raw.parentId || raw.id || '';
    return {
      ...raw,
      id,
      studentId:raw.studentId || (role === 'Student' ? id : ''),
      name:raw.name || raw.studentName || raw.teacherName || 'User',
      mobile:raw.mobile || '',
      role,
      board:raw.board || '',
      className:raw.className || raw.class || '',
      medium:raw.medium || '',
      status:raw.status || 'Active',
      studentType:raw.studentType || ''
    };
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(WTC_CONFIG.STORAGE_KEY) || sessionStorage.getItem(WTC_CONFIG.STORAGE_KEY) || 'null');
    } catch (error) {
      return null;
    }
  }

  function setUser(user) {
    const clean = normalizeUser(user);
    localStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(clean));
    sessionStorage.setItem(WTC_CONFIG.STORAGE_KEY, JSON.stringify(clean));
  }

  function clearUser() {
    localStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
    sessionStorage.removeItem(WTC_CONFIG.STORAGE_KEY);
  }

  function redirectByRole(user) {
    const role = String(user.role || 'Student').toLowerCase();
    let page = 'student.html';
    if (role === 'teacher') page = 'teacher.html';
    else if (role === 'admin') page = 'admin.html';
    else if (role === 'parent') page = 'parent.html';
    window.location.replace((WTC_CONFIG.BASE_URL || '/') + page);
  }

  function requireRole(role) {
    const user = getUser();
    if (!user || String(user.role || '').toLowerCase() !== role.toLowerCase()) {
      location.href = WTC_CONFIG.LOGIN_PAGE;
      return null;
    }
    return normalizeUser(user);
  }

  async function handleLogin(formId='loginForm') {
    const form = document.getElementById(formId);
    if (!form) return;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!form.checkValidity()) {
      form.reportValidity();
      WTC_UI.setStatus('loginStatus', 'Please complete the required login fields.', 'error');
      return;
    }

    const fd = Object.fromEntries(new FormData(form).entries());
    const mobile = normalizeMobile(fd.mobile);
    const password = String(fd.password || '').trim();
    const role = fd.role || 'Student';

    if (!/^\d{10}$/.test(mobile)) {
      WTC_UI.setStatus('loginStatus', 'Enter a valid 10-digit mobile number.', 'error');
      return WTC_UI.toast('Enter a valid 10-digit mobile number.', 'error');
    }
    if (!password) {
      WTC_UI.setStatus('loginStatus', 'Please enter your password.', 'error');
      return WTC_UI.toast('Please enter your password.', 'error');
    }

    WTC_UI.setBusy(submitButton, true, 'Logging in...');
    WTC_UI.setStatus('loginStatus', 'Checking your account...', 'info');

    try {
      const data = await WTC_API.login(mobile, password, role);
      if (!data.success) {
        WTC_UI.setStatus('loginStatus', data.message || 'Login failed.', 'error');
        return WTC_UI.toast(data.message || 'Login failed.', 'error');
      }
      setUser(data.user);
      WTC_UI.setStatus('loginStatus', 'Login successful. Opening your portal...', 'success');
      WTC_UI.toast('Login successful.', 'success');
      window.setTimeout(() => redirectByRole(normalizeUser(data.user)), 350);
    } catch (error) {
      WTC_UI.setStatus('loginStatus', error.message || 'Login failed. Please try again.', 'error');
      WTC_UI.toast(error.message || 'Login failed. Please try again.', 'error');
    } finally {
      WTC_UI.setBusy(submitButton, false);
    }
  }

  async function handleSignup(formId='signupForm') {
    const form = document.getElementById(formId);
    if (!form) return;
    const submitButton = form.querySelector('button[type="submit"]');

    if (!form.checkValidity()) {
      form.reportValidity();
      WTC_UI.setStatus('signupStatus', 'Please complete all required signup fields.', 'error');
      return;
    }

    const fd = Object.fromEntries(new FormData(form).entries());
    fd.name = String(fd.name || '').trim();
    fd.mobile = normalizeMobile(fd.mobile);
    fd.password = String(fd.password || '').trim();

    if (!fd.name || !/^\d{10}$/.test(fd.mobile) || !fd.password) {
      WTC_UI.setStatus('signupStatus', 'Enter a student name, valid mobile number and password.', 'error');
      return WTC_UI.toast('Please fill the required signup fields correctly.', 'error');
    }

    WTC_UI.setBusy(submitButton, true, 'Creating account...');
    WTC_UI.setStatus('signupStatus', 'Creating your student account...', 'info');

    try {
      const data = await WTC_API.signupStudent(fd);
      if (!data.success) {
        WTC_UI.setStatus('signupStatus', data.message || 'Signup failed.', 'error');
        return WTC_UI.toast(data.message || 'Signup failed.', 'error');
      }
      setUser(data.user);
      WTC_UI.setStatus('signupStatus', 'Account created. Opening the Student Portal...', 'success');
      WTC_UI.toast('Account created successfully.', 'success');
      window.setTimeout(() => redirectByRole(normalizeUser(data.user)), 350);
    } catch (error) {
      WTC_UI.setStatus('signupStatus', error.message || 'Signup failed. Please try again.', 'error');
      WTC_UI.toast(error.message || 'Signup failed. Please try again.', 'error');
    } finally {
      WTC_UI.setBusy(submitButton, false);
    }
  }

  function logout() {
    clearUser();
    location.href = WTC_CONFIG.LOGIN_PAGE;
  }

  return {
    deviceId,
    normalizeUser,
    getUser,
    setUser,
    clearUser,
    redirectByRole,
    requireRole,
    handleLogin,
    handleSignup,
    logout
  };
})();
