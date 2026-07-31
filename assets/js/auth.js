/* WAGH Tuition Classes — Authentication helpers H1.4.4 (backward compatible) */
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

  async function handleLogin(formId='loginForm', options={}) {
    if (formId && typeof formId === 'object') {
      options = formId;
      formId = options.formId || 'loginForm';
    }
    options = options || {};

    const form = document.getElementById(formId);
    if (!form) return { success:false, message:'Login form is unavailable.' };

    const submitButton = form.querySelector('button[type="submit"]');
    const statusId = options.statusId || 'loginStatus';
    const shouldRedirect = options.redirect !== false;
    const shouldToast = options.toast !== false;
    const forcedRole = String(options.role || '').trim();
    const requiredRole = String(options.requiredRole || '').trim().toLowerCase();

    if (!form.checkValidity()) {
      form.reportValidity();
      WTC_UI.setStatus(statusId, 'Please complete the required login fields.', 'error');
      return { success:false, message:'Please complete the required login fields.' };
    }

    const fd = Object.fromEntries(new FormData(form).entries());
    const mobile = normalizeMobile(fd.mobile);
    const password = String(fd.password || '').trim();
    const role = forcedRole || fd.role || 'Student';

    if (!/^\d{10}$/.test(mobile)) {
      const message = 'Enter a valid 10-digit mobile number.';
      WTC_UI.setStatus(statusId, message, 'error');
      if (shouldToast) WTC_UI.toast(message, 'error');
      return { success:false, message };
    }
    if (!password) {
      const message = 'Please enter your password.';
      WTC_UI.setStatus(statusId, message, 'error');
      if (shouldToast) WTC_UI.toast(message, 'error');
      return { success:false, message };
    }

    WTC_UI.setBusy(submitButton, true, 'Logging in...');
    WTC_UI.setStatus(statusId, 'Checking your account...', 'info');

    try {
      const data = await WTC_API.login(mobile, password, role);
      if (!data.success) {
        const message = data.message || 'Login failed.';
        WTC_UI.setStatus(statusId, message, 'error');
        if (shouldToast) WTC_UI.toast(message, 'error');
        return { success:false, message };
      }

      const cleanUser = normalizeUser(data.user);
      const actualRole = String(cleanUser.role || '').toLowerCase();
      if (requiredRole && actualRole !== requiredRole) {
        const message = `${requiredRole.charAt(0).toUpperCase()}${requiredRole.slice(1)} login is required here.`;
        WTC_UI.setStatus(statusId, message, 'error');
        if (shouldToast) WTC_UI.toast(message, 'error');
        return { success:false, message };
      }

      setUser(cleanUser);
      WTC_UI.setStatus(
        statusId,
        options.successMessage || (shouldRedirect ? 'Login successful. Opening your portal...' : 'Login successful. Loading your challenge...'),
        'success'
      );
      if (shouldToast) WTC_UI.toast('Login successful.', 'success');

      if (typeof options.onSuccess === 'function') {
        await options.onSuccess(cleanUser, data);
      }

      if (shouldRedirect) window.setTimeout(() => redirectByRole(cleanUser), 350);
      return { success:true, user:cleanUser, data };
    } catch (error) {
      const message = error.message || 'Login failed. Please try again.';
      WTC_UI.setStatus(statusId, message, 'error');
      if (shouldToast) WTC_UI.toast(message, 'error');
      return { success:false, message, error };
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
    if (window.WTC_REFERRAL_ATTRIBUTION?.getCode) fd.referralCode = WTC_REFERRAL_ATTRIBUTION.getCode();

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

// H1.4.1 compatibility bridge for feature modules that access the auth API through window.
window.WTC_AUTH = WTC_AUTH;
